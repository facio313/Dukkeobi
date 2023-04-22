<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<c:set value="${pageContext.request.contextPath}" var="context"/>
<title>두꺼비 : 새집 다오</title>
<style>
	#map {
		width: 100%;
		height: 100vh;
		border: 1px solid red;
	}
</style>
<link rel="stylesheet" href="${context}/resources/js/bootstrap-5.2.3-dist/css/bootstrap.min.css">    
<link rel="stylesheet" href="${context}/resources/js/ol/ol.css">    
</head>
<body>
<div id="map" class="map"></div>
<script src="${context}/resources/js/ol/ol.js"></script>
<script src="${context}/resources/js/ol/jsts.min.js"></script>
<script src="${context}/resources/js/ol/proj4js-2.3.14.js"></script>
<script>
proj4.defs('EPSG:5181', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');
ol.proj.proj4.register(proj4);

const map = new ol.Map({
	target: 'map',
	layers: [
		new ol.layer.Tile({
		source: new ol.source.OSM()
	})],
	view: new ol.View({
	    projection: ol.proj.get('EPSG:5181'),
	    center: [199930.2755757971,444198.8519182416],
	    zoom: 12
	})
});



function addWMS(url){
  	const layer = new ol.layer.Tile({
    	source: new ol.source.TileWMS({
      		url: url,
      		params: {'LAYERS': 'A2SM_CrmnlHspot_Tot_Tot',
               	'styles': 'A2SM_CrmnlHspot_Tot_Tot'
            },
    	}),
	});
  map.addLayer(layer);
}

addWMS('http://www.safemap.go.kr/openApiService/wms/getLayerData.do?apikey=LPGGTEYH-LPGG-LPGG-LPGG-LPGGTEYH1M');



</script>
</body>
</html>