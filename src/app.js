function validatePosterData(data) {
  console.log('掲示場所データ検証: ' + data.length + '件');
  var seenIds = {}, seenCoords = {}, warnings = 0;
  var LAT_MIN = 35.7, LAT_MAX = 36.1, LNG_MIN = 135.9, LNG_MAX = 136.6;
  data.forEach(function(item) {
    var prefix = '[No.' + item.id + ']';
    if (seenIds[item.id]) { console.warn(prefix + ' id が重複しています'); warnings++; }
    else { seenIds[item.id] = item.id; }
    if (!item.address) { console.warn(prefix + ' address が空です'); warnings++; }
    if (!item.description) { console.warn(prefix + ' description が空です'); warnings++; }
    if (item.lat === null || item.lat === undefined || item.lng === null || item.lng === undefined) {
      console.warn(prefix + ' lat/lng が欠損しています'); warnings++; return;
    }
    if (typeof item.lat !== 'number' || typeof item.lng !== 'number') {
      console.warn(prefix + ' lat/lng が数値型ではありません'); warnings++; return;
    }
    if (item.lat < LAT_MIN || item.lat > LAT_MAX || item.lng < LNG_MIN || item.lng > LNG_MAX) {
      console.warn(prefix + ' 座標が越前市エリア外です'); warnings++;
    }
    var coordKey = item.lat + ',' + item.lng;
    if (seenCoords[coordKey]) { console.warn(prefix + ' が No.' + seenCoords[coordKey] + ' と同一座標です'); warnings++; }
    else { seenCoords[coordKey] = item.id; }
  });
  var ids = data.map(function(d) { return d.id; }).sort(function(a, b) { return a - b; });
  for (var i = 0; i < ids.length - 1; i++) {
    if (ids[i+1] - ids[i] > 1) {
      for (var m = ids[i]+1; m < ids[i+1]; m++) { console.warn('[欠番] id=' + m); warnings++; }
    }
  }
  if (warnings > 0) { console.warn('データ検証: ' + warnings + '件の警告があります'); }
}

var selectedMarker = null;
var selectedItem = null;
var currentMode = 1;
var allMarkers = {};
var map = null;
var distributionMap = {};

function buildDistributionMap() {
  DISTRIBUTION_GROUPS.forEach(function(group) {
    group.ids.forEach(function(id) {
      distributionMap[id] = { fill: group.fill, stroke: group.stroke, textColor: group.textColor };
    });
  });
}

function baseColor(id) {
  if ((id >= 1 && id <= 73) || (id >= 110 && id <= 139) || (id >= 174 && id <= 188)) {
    return '#e53e3e';
  }
  return '#38a169';
}

function makeIcon(fillColor, strokeColor) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 14,
    fillColor: fillColor,
    fillOpacity: 1,
    strokeColor: strokeColor,
    strokeWeight: 2
  };
}

function makeLabel(text, color) {
  return { text: text, color: color, fontSize: '11px', fontWeight: 'bold' };
}

function restoreMarkerAppearance(marker, item) {
  if (currentMode === 1) {
    marker.setIcon(makeIcon(baseColor(item.id), '#ffffff'));
    marker.setLabel(makeLabel(String(item.id), '#ffffff'));
  } else {
    var info = distributionMap[item.id];
    if (info) {
      marker.setIcon(makeIcon(info.fill, info.stroke));
      marker.setLabel(makeLabel(String(item.id), info.textColor));
    }
  }
}

function showDetail(item) {
  var panel = document.getElementById('detail-panel');
  var isMobile = window.innerWidth <= 640;
  panel.innerHTML =
    (isMobile ? '<button id="panel-close" class="panel-close-btn">✕</button>' : '') +
    '<p class="detail-title">選択中のポスター掲示場所</p>' +
    '<dl>' +
      '<dt>No.</dt><dd>' + item.id + '</dd>' +
      '<dt>住所</dt><dd>' + item.address + '</dd>' +
      '<dt>設置箇所</dt><dd>' + item.description + '</dd>' +
      '<dt>緯度</dt><dd>' + item.lat + '</dd>' +
      '<dt>経度</dt><dd>' + item.lng + '</dd>' +
      '<dt>座標確認</dt><dd>' + item.status + '</dd>' +
    '</dl>';
  panel.classList.add('panel-active');
  if (isMobile) {
    document.getElementById('panel-close').addEventListener('click', function() {
      panel.classList.remove('panel-active');
    });
  }
}

function createMarker(item) {
  var marker = new google.maps.Marker({
    position: { lat: item.lat, lng: item.lng },
    map: map,
    label: makeLabel(String(item.id), '#ffffff'),
    icon: makeIcon(baseColor(item.id), '#ffffff')
  });
  marker.addListener('click', function() {
    if (selectedMarker && selectedMarker !== marker) {
      restoreMarkerAppearance(selectedMarker, selectedItem);
    }
    marker.setIcon(makeIcon('#2b6cb0', '#ffffff'));
    marker.setLabel(makeLabel(String(item.id), '#ffffff'));
    selectedItem = item;
    selectedMarker = marker;
    showDetail(item);
  });
  return marker;
}

function setMode(mode) {
  selectedMarker = null;
  selectedItem = null;
  currentMode = mode;

  var panel = document.getElementById('detail-panel');
  panel.innerHTML = '<p class="placeholder">マーカーをクリックすると詳細が表示されます。</p>';
  panel.classList.remove('panel-active');

  POSTER_DATA.forEach(function(item) {
    var marker = allMarkers[item.id];
    if (!marker) return;
    if (mode === 1) {
      marker.setMap(map);
      marker.setIcon(makeIcon(baseColor(item.id), '#ffffff'));
      marker.setLabel(makeLabel(String(item.id), '#ffffff'));
    } else {
      var info = distributionMap[item.id];
      if (info) {
        marker.setMap(map);
        marker.setIcon(makeIcon(info.fill, info.stroke));
        marker.setLabel(makeLabel(String(item.id), info.textColor));
      } else {
        marker.setMap(null);
      }
    }
  });

  if (mode === 1) {
    document.getElementById('count-info').textContent = '掲示場所: ' + POSTER_DATA.length + '件';
  } else {
    document.getElementById('count-info').textContent = '配分: ' + Object.keys(distributionMap).length + '件 表示中';
  }

  document.getElementById('btn-mode1').classList.toggle('mode-btn-active', mode === 1);
  document.getElementById('btn-mode2').classList.toggle('mode-btn-active', mode === 2);
}

function initMap() {
  buildDistributionMap();

  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.9014, lng: 136.1654 },
    zoom: 13
  });

  document.getElementById('count-info').textContent = '掲示場所: ' + POSTER_DATA.length + '件';
  validatePosterData(POSTER_DATA);

  POSTER_DATA.forEach(function(item) {
    allMarkers[item.id] = createMarker(item);
  });
}

window.initMap = initMap;
window.setMode = setMode;
