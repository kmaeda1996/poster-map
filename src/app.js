function validatePosterData(data) {
  console.log('掲示場所データ検証: ' + data.length + '件');

  var seenIds = {};
  var seenCoords = {};
  var warnings = 0;

  // 越前市周辺の座標範囲
  var LAT_MIN = 35.7, LAT_MAX = 36.1;
  var LNG_MIN = 135.9, LNG_MAX = 136.6;

  data.forEach(function(item, index) {
    var prefix = '[No.' + item.id + ']';

    // id 重複チェック
    if (seenIds[item.id]) {
      console.warn(prefix + ' id が重複しています（前出: No.' + seenIds[item.id] + '）');
      warnings++;
    } else {
      seenIds[item.id] = item.id;
    }

    // address 欠損チェック
    if (!item.address) {
      console.warn(prefix + ' address が空です');
      warnings++;
    }

    // description 欠損チェック
    if (!item.description) {
      console.warn(prefix + ' description が空です');
      warnings++;
    }

    // lat / lng 欠損チェック
    if (item.lat === null || item.lat === undefined || item.lng === null || item.lng === undefined) {
      console.warn(prefix + ' lat/lng が欠損しています');
      warnings++;
      return;
    }

    // lat / lng が number 型かチェック
    if (typeof item.lat !== 'number' || typeof item.lng !== 'number') {
      console.warn(prefix + ' lat/lng が数値型ではありません (lat=' + item.lat + ', lng=' + item.lng + ')');
      warnings++;
      return;
    }

    // 越前市周辺の範囲チェック
    if (item.lat < LAT_MIN || item.lat > LAT_MAX || item.lng < LNG_MIN || item.lng > LNG_MAX) {
      console.warn(prefix + ' 座標が越前市エリア外です (lat=' + item.lat + ', lng=' + item.lng + ')');
      warnings++;
    }

    // 同一座標チェック
    var coordKey = item.lat + ',' + item.lng;
    if (seenCoords[coordKey]) {
      console.warn(prefix + ' が No.' + seenCoords[coordKey] + ' と同一座標です (' + coordKey + ')');
      warnings++;
    } else {
      seenCoords[coordKey] = item.id;
    }
  });

  // id 欠番チェック
  var ids = data.map(function(d) { return d.id; }).sort(function(a, b) { return a - b; });
  for (var i = 0; i < ids.length - 1; i++) {
    if (ids[i + 1] - ids[i] > 1) {
      for (var missing = ids[i] + 1; missing < ids[i + 1]; missing++) {
        console.warn('[欠番] id=' + missing + ' が存在しません');
        warnings++;
      }
    }
  }

  if (warnings > 0) {
    console.warn('データ検証: ' + warnings + '件の警告があります');
  }
}

var selectedMarker = null;
var selectedItem = null;

function baseColor(id) {
  if ((id >= 1 && id <= 73) || (id >= 110 && id <= 139) || (id >= 174 && id <= 188)) {
    return '#e53e3e'; // 赤
  }
  return '#38a169'; // 緑
}

function markerIcon(id, selected) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 14,
    fillColor: selected ? '#2b6cb0' : baseColor(id),
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2
  };
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

function createMarker(map, item) {
  var marker = new google.maps.Marker({
    position: { lat: item.lat, lng: item.lng },
    map: map,
    label: {
      text: String(item.id),
      color: '#ffffff',
      fontSize: '11px',
      fontWeight: 'bold'
    },
    icon: markerIcon(item.id, false)
  });

  marker.addListener('click', function() {
    if (selectedMarker) {
      selectedMarker.setIcon(markerIcon(selectedItem.id, false));
    }
    marker.setIcon(markerIcon(item.id, true));
    selectedItem = item;
    selectedMarker = marker;
    showDetail(item);
  });

  return marker;
}

function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.9014, lng: 136.1654 },
    zoom: 13
  });

  document.getElementById('count-info').textContent = '掲示場所: ' + POSTER_DATA.length + '件';

  validatePosterData(POSTER_DATA);

  POSTER_DATA.forEach(function(item) {
    createMarker(map, item);
  });

}

window.initMap = initMap;
