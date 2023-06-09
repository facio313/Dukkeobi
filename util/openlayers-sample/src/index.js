import 'ol/ol.css';
import {Map, View} from 'ol';

import OSM from 'ol/source/OSM';
import $ from 'jquery';

import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import {get as getProjection, fromLonLat} from 'ol/proj';

import TileLayer from 'ol/layer/Tile';  
import TileWMS from 'ol/source/TileWMS';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {GeoJSON} from 'ol/format';
import {tile as strategyTile} from 'ol/loadingstrategy';
import {createXYZ} from 'ol/tilegrid';
import {Fill, Stroke, Circle as CircleStyle, Style, Text} from 'ol/style';

// 사용할 클래스, 함수는 import해야 함
import {Image as ImageLayer} from 'ol/layer';
import ImageWMS from 'ol/source/ImageWMS';
import {bbox as bboxStrategy} from 'ol/loadingstrategy.js';
// bbox : bounding box의 준말
import Overlay from 'ol/Overlay.js';
import {toLonLat} from 'ol/proj.js';
import Feature from 'ol/Feature.js';
// 이 class는 ol의 클래스. 뒤에 feature는 다 이 클래스
// feature.getGeometry()에서 나온 건 ol의 multipolygon임.
// DB의 geom과는 다름!!
// jstsGeom과도 다름.
import {Cluster} from 'ol/source.js';
import {boundingExtent} from 'ol/extent.js';
import Point from 'ol/geom/Point.js';
import {Heatmap as HeatmapLayer} from 'ol/layer.js';
import {LineString, MultiLineString, MultiPoint, MultiPolygon, Polygon} from 'ol/geom.js';
import LinearRing from 'ol/geom/LinearRing.js';




proj4.defs(
  'EPSG:5174', '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43'
);
register(proj4);

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  /*
  view: new View({
    projection: getProjection('EPSG:5174'),
    center: fromLonLat([127, 37.5], 'EPSG:5174'),
    zoom: 12
  })
  */
  view: new View({
    projection: getProjection('EPSG:3857'),
    center: [-10997148, 4569099],
    zoom: 4
 })
});

function addWMS_emd(){
  const layer = new TileLayer({
    source: new TileWMS({
      url: 'http://localhost:8888/geoserver/wms',
      params: {'LAYERS': 'test:admin_emd', 
                'VERSION': '1.1.1',
                'SRS': 'EPSG:3857'
              }
    }),
  });

  map.addLayer(layer);
}

// 타일로 갖고 온 것
function addWMS_seoulPoint(){
  const layer = new TileLayer({
    source: new TileWMS({
      url: 'http://localhost:8888/geoserver/wms',
      params: {'LAYERS': 'ex:seoul_point', 
                'VERSION': '1.1.1'}
    }),
  });

  map.addLayer(layer);
}

function addWFS_seoulPoint(){
  var stroke = new Stroke({
    color: '#3399CC',
    width: 1.25
  });

  const layerId = 'ex:seoul_point';
  let url = 'http://localhost:8888/geoserver/wfs?'
            + 'service=WFS'
            + '&version=1.1.1'
            + '&request=GetFeature'
			 	    + '&typename='+ layerId
			 	    + '&outputFormat=application/json'
			 	    + '&srsname=EPSG:5174' 
             +'&bbox={bbox},EPSG:5174';
  
    const layer = new VectorLayer({
      source: new VectorSource({
        url: function(extent){
          return url.replace("{bbox}", extent.join(','));
        },
        format: new GeoJSON({defaultDataProjection: 'EPSG:5174'}),
        strategy: strategyTile(createXYZ())
      }),
      style: new Style({
        image: new Circle({
          stroke: stroke,
          radius: 1
        }),
       stroke: stroke
      })
    });
    	
    map.addLayer(layer);
}

addWMS_emd();
//addWMS_seoulPoint();
//addWFS_seoulPoint();

// 내가 해본 것
let test01 = new ImageLayer({
  source : new ImageWMS({
    url: 'http://192.168.0.44:8888/geoserver/wms',
    params: {'LAYERS': 'topp:states'},
  })
});

//map.addLayer(test01);

function test02(){ // 타일로 가져오면 속도 빨라~~
  const layer = new TileLayer({
    source: new TileWMS({
      url: 'http://localhost:8888/geoserver/wms',
      params: {'LAYERS': 'topp:states', 
                'TILED': true}, //TILED 굳이 안 써도
      serverType: 'geoserver',
      transition: 0
    }),
  });

  map.addLayer(layer);
}
//test02();

// 통짜로 갖고 온 것
let selected = null;
// window.vectorLayer = null;
// VectorLayer : 여기에 Feature 어쩌고의 정보가 들어있으
function addWfs() {
  const vectorSource = new VectorSource({
    format: new GeoJSON(),
    /*
    url: function (extent) { // extent : 사용자 화면에서 보이는 bbox 기준으로 가져온 지도 정보
      // console.log(extent); // 지도 옮겨보고 확인해보기
      return (
        'https://ahocevar.com/geoserver/wfs?service=WFS&' +
        'version=1.1.0&request=GetFeature&typename=topp:states&' +
        'outputFormat=application/json&srsname=EPSG:3857&' +
        'bbos=' +
        extent.join(',') +
        ',EPSG:3857'
      );
    },
    */
    loader: function(extent, resolution, projection, success, failure) {
      const url = 'https://ahocevar.com/geoserver/wfs?service=WFS&' +
      'version=1.1.0&request=GetFeature&typename=topp:states&' +
      'outputFormat=application/json&srsname=EPSG:3857&' +
      'bbos=' +
      extent.join(',') +
      ',EPSG:3857';
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      const onError = function() {
        vectorSource.removeLoadedExtent(extent);
        failure();
      }
      xhr.onerror = onError;
      xhr.onload = function() {
        if (xhr.status == 200) {
          const features = vectorSource.getFormat().readFeatures(xhr.responseText);
          const parser = new jsts.io.OL3Parser();
          parser.inject(
            Point,
            LineString,
            LinearRing,
            Polygon,
            MultiPoint,
            MultiLineString,
            MultiPolygon
          );
      
          for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            // convert the OpenLayers geometry to a JSTS geometry
            const jstsGeom = parser.read(feature.getGeometry());
      
            // create a buffer of 40 meters around each line
            const buffered = jstsGeom.buffer(40000);
      
            // convert back from JSTS and replace the geometry on the feature
            feature.setGeometry(parser.write(buffered));
          }

          vectorSource.addFeatures(features);
          success(features);
        } else {
          onError();
        }
      }
      xhr.send();
    },
    strategy: bboxStrategy
  });

  const vector = new VectorLayer({
    source: vectorSource
  });

  map.addLayer(vector);

  const selectStyle = new Style({
    fill: new Fill({
      color: '#eeeeee'
    }),
    stroke: new Stroke({
      color: 'rgba(255, 255, 255, 0.7)',
      width: 2
    })
  });

  // 이벤트
  map.on('pointermove', (e) => {
    // 밑에 f가 selected에 있으니 null이 아님
    if (selected !== null) {
      selected.setStyle(undefined);
      selected = null;
    }
    
    map.forEachFeatureAtPixel(e.pixel, function(f) {
      selected = f;
      f.setStyle(selectStyle);
      return true; // 무시해도 됨
    });
    
    if (selected) {
      console.log(selected.get('STATE_NAME'));
    }
  });
}

addWfs();

// 차장님꺼 -> wmsSource 해놓은 거 있으니까 그거 가져오면 됨
// let wmsSource = layer.getSource();
let  wmsSource = new TileWMS({
  url: 'http://localhost:8888/geoserver/wms',
  params: {'LAYERS': 'topp:states', 'TILED': true},
  serverType: 'geoserver',
});


map.on('singleclick', function(evt) {
  document.getElementById('info').innerHTML = '';
  var viewResolution = /** @type {number} */ (map.getView().getResolution());
  // 차장님
  // let url = wmsSource.getFeatureInfoUrl(e.coordinate, map.getView()/getResolution(), 'EPSG:3857', {'info_format': 'text/html'});
  var url = wmsSource.getFeatureInfoUrl(
    evt.coordinate, // 좌표 -> postgis의 좌표를 가져오면 됨
    viewResolution,
    'EPSG:3857',
    {'INFO_FORMAT': 'text/html'}
  );
  if (url) {
    fetch(url) // ajax 긁어오기
      .then(function (response) {return response.text();})
      .then(function (html) {
        document.getElementById('info').innerHTML = html;
      });
  }
});

var addOverlay = () => {
  let popupDiv = document.createElement("div");
  const popup = new Overlay({
    element:popupDiv
  });
  map.addOverlay(popup);

  map.on('click', function(event) {
    const coordinate = event.coordinate;
    const hdms = toLonLat(coordinate);
    popup.setPosition(coordinate);

    popup.getElement().innerHTML = hdms;
  });
}

addOverlay();

function addCluster() {
  var count = 20000;
  var features = new Array(count);
  var e = 4500000;
  for (var i = 0; i < count; ++i) {
    var coordinates = [2* e * Math.random() - e, 2 * e * Math.random() - e];
    features[i] = new Feature(new Point(coordinates));
  }
  
  var source = new VectorSource({
    features: features
  });
  
  var clusterSource = new Cluster({
    distance: parseInt(40, 10),
    source: source
  });
  
  var styleCache = {};
  var clusterLayer = new VectorLayer({
    source: clusterSource,
    style: function(feature) {
      const size = feature.get('features').length;
      let style = styleCache[size];
      if (!style) {
        style = new Style({
          image: new CircleStyle({
            radius: 10,
            stroke: new Stroke({
              color: '#fff',
            }),
            fill: new Fill({
              color: '#3399CC',
            }),
          }),
          text: new Text({
            text: size.toString(),
            fill: new Fill({
              color: '#fff',
            }),
          }),
        });
        styleCache[size] = style;
      }
      return style;
    }
  });
  map.on('click', (e) => {
    clusterLayer.getFeatures(e.pixel).then((clickedFeatures) => {
      if (clickedFeatures.length) {
        // Get clustered Coordinates
        const features = clickedFeatures[0].get('features');
        if (features.length > 1) {
          const extent = boundingExtent(
            features.map((r) => r.getGeometry().getCoordinates())
          );
          map.getView().fit(extent, {duration: 1000, padding: [50, 50, 50, 50]});
        }
      }
    });
  });

  map.addLayer(clusterLayer);
}

addCluster();

function addHeatMap() {
  var count = 2000;
  var features = new Array(count);
  var e = 4500000;
  for (var i = 0; i < count; ++i) {
    var coordinates = [2* e * Math.random() - e, 2 * e * Math.random() - e];
    features[i] = new Feature(new Point(coordinates));
  }
  
  var vector = new HeatmapLayer({
    source: new VectorSource({
      features: features
    }),
    blur: parseInt(8, 10),
    radius: parseInt(6, 10),
    weight: function(feature) {
      return 1;
    }
  });
  map.addLayer(vector);
}

addHeatMap();

function jsts1() {
  var parser = new jsts.io.OL3Parser();
  parser.inject(
    Point, LineString, LinearRing, Polygon, MultiPoint, MultiLineString, MultiPolygon
  );
  
  for (var i = 0; i < features.length; i++) {
    var feature = features[i];
    var jstsGeom = parser.read(feature.getGeometry());
    var buffered = jstsGeom.buffer(40);
    feature.setGeometry(parser.write(buffered));
  }
  
  source.addFeatures(features);
}


class test1 {

}
