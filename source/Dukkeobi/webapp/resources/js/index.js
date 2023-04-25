/* ===================main=================== */
const url = "http://localhost:8888/geoserver/wms";
let vworldKey = "783D66F2-A36F-3995-B0D6-35F1429C1BFE";

//좌표계 설정
proj4.defs('EPSG:3857', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');
ol.proj.proj4.register(proj4);

//지도
const map = new ol.Map({
	target: 'map',
	layers: [
		new ol.layer.Tile({
		source: new ol.source.OSM()
	})],
	view: new ol.View({
	    projection: ol.proj.get('EPSG:3857'),
	    center: [14127388, 4517328],
	    zoom: 14
	})
});

//변수
let veil = $("#veil");
let menu = $("#menu");
let search = $("#search");
let inquire = $("#inquire");
let observe = $("#observe");
let analyze = $("#analyze");
let history = $("#history");
let side = $("#side");

//메인화면 -> 지도화면
veil.on("click", function(){
	if (veil.hasClass("veiled")) {
		veil.attr("class", "unveiled");
		menu.removeClass("bigMenu").addClass("smallMenu");
		search.attr("class", "smallMenuSearch");
		inquire.removeClass("bigMenuBtn").addClass("smallMenuBtn");
		observe.removeClass("bigMenuBtn").addClass("smallMenuBtn");
		analyze.removeClass("bigMenuBtn").addClass("smallMenuBtn");
		history.removeClass("bigMenuBtn").addClass("smallMenuBtn");
		side.css({"visibility":"visible", "width":"23%"});
	}
}).trigger("click");

function addSafety(url){
	let layer = new ol.layer.Tile({
 	source: new ol.source.TileWMS({
   		url: url,
   		params: {
   			'LAYERS': 'Dukkeobi:safety'
            	, 'styles': ''
            	, 'cql_filter' : "safety_gub = '치안시설'"
         },
 	}),
	});
map.addLayer(layer);
}

//addSafety(url);

$(".backBtn").on("click", function() {
	if (veil.hasClass("unveiled")) {
		veil.attr("class", "veiled");
		menu.addClass("bigMenu").removeClass("smallMenu");
		search.attr("class", "bigMenuSearch");
		inquire.removeClass("smallMenuBtn").addClass("bigMenuBtn");
		observe.removeClass("smallMenuBtn").addClass("bigMenuBtn");
		analyze.removeClass("smallMenuBtn").addClass("bigMenuBtn");
		history.removeClass("smallMenuBtn").addClass("bigMenuBtn");
		side.css({"visibility":"hidden", "width":"0%"});
	}	
});

/* ===================srf-001=================== */
let search1 = $("#search1");
let searchBtn1 = $("#searchBtn1");
let selectSido = search1.children("select").first();
let selectSgg = $("#selectSgg");
let selectEmd = search1.children("select").last();
let resultAddr = $("#resultAddr");
let resultSido = $("#resultSido");
let resultSgg = $("#resultSgg");
let resultEmd = $("#resultEmd");

// option 태그 만들기
const sidoList = ["시/도", "강원도", "경기도", "경상남도", "경상북도", "광주광역시", "대구광역시", "대전광역시", "부산광역시", "서울특별시", "세종특별자치시", "울산광역시", "인천광역시", "전라남도", "전라북도", "제주특별자치도", "충청남도", "충청북도"];
const sggList = ["시/군/구", "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"];
const emdList = ["읍/면/동", "용강동", "대흥동", "염리동", "신수동", "서교동", "합정동", "망원1동", "망원2동", "연남동", "성산1동", "성산2동", "상암동", "도화동", "서강동", "공덕동", "아현동"];
function makeOptionTag(select, list) {
	select.innerHTML = "";
	let tags = "";
	$.each(list, function(index, item) {
		tags += `<option>${item}</option>`;
		
	});
	select.innerHTML = tags;
}
makeOptionTag(selectSido[0], sidoList);
makeOptionTag(selectSgg[0], sggList);
makeOptionTag(selectEmd[0], emdList);

// 선택된 주소 바꾸기
selectSido.on("change", function() {resultSido.html($(this).val());});
selectSgg.on("change", function() {resultSgg.html($(this).val());});
selectEmd.on("change", function() {resultEmd.html($(this).val());});

// 검색버튼 클릭하기
searchBtn1.on("click", function() {
	let adm_nm = $("#resultEmd").html();
	map.getLayers().getArray()
						.filter(layer => layer.get('name') !== adm_nm && layer.sourceChangeKey_.target.ol_uid !== "1")
						.forEach(layer => map.removeLayer(layer));
	searchEmd(url, adm_nm);
	$.ajax({
		url : `https://api.vworld.kr/req/search?request=search&type=district&category=L4&key=${vworldKey}&crs=EPSG:3857&query=${adm_nm.substring(0, 2)}`,
		dataType : "jsonp",
		success : function(resp) {
			console.log(resp);
			$.each(resp.response.result.items, function(index, item) {
				if (item.id.indexOf("11440") != -1) {
					map.getView().setCenter([item.point.x, item.point.y]);
					map.getView().setZoom(14);
				}
			});
		},
		error : function(jqXHR, status, error) {
			console.log(jqXHR);
			console.log(status);
			console.log(error);
		}
	});
});

// 검색 조건에 따른 조회하기
// 나중에 코드로 바꿔주기 - vworld 법정동/행정동 이슈..
function searchEmd(url, adm_nm) {
	let layer = new ol.layer.Tile({
		name : adm_nm
		, source : new ol.source.TileWMS({
			url : url
			, params : {
				layers : "Dukkeobi:mapogu_emd"
				, styles : "search_emd"
				, cql_filter : `adm_nm = '${adm_nm}'`
			}
		})
	});
	map.addLayer(layer);
	
	map.addEventListener("singleclick", function(evt) {
		document.querySelector("#info").innerHTML = "";
		var viewResolution = /** @type {number} */ (map.getView().getResolution());
		var urll = layer.getSource.getFeatureInfoUrl(
			evt.coordinate
			, viewResolution
			, "EPSG:3857"
			, {INFO_FORMAT : "text/html"}
		);
		console.log(urll);
		if (urll) {
			fetch(urll)
				.then(function(response) {return response.text();})
				.then(function(html) {document.getElementById("info").innerHTML = html;});
		}		
	});
}
// 클릭 해당 위치 정보
var addOverlay = () => {
  	let popupDiv = document.createElement("div");
  	const popup = new ol.Overlay({
    	element:popupDiv
  	});
  	map.addOverlay(popup);

  	map.on('click', function(evt) {
    	const coordinate = evt.coordinate;
    	const hdms = ol.proj.toLonLat(coordinate);
    	popup.setPosition(coordinate);
    	popup.getElement().innerHTML = hdms;
  	});
}

addOverlay();