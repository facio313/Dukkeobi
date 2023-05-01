/* ===================main=================== */
const context = $("#context").val();
const url = "http://localhost:8888/geoserver/wms";
let vworldKey = "783D66F2-A36F-3995-B0D6-35F1429C1BFE";

//좌표계 설정
proj4.defs('EPSG:3857', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');
ol.proj.proj4.register(proj4);

let bgLayer = [
	new ol.layer.Tile({
		name: 'base',
		source: new ol.source.XYZ({
			url: "http://api.vworld.kr/req/wmts/1.0.0/783D66F2-A36F-3995-B0D6-35F1429C1BFE/Base/{z}/{y}/{x}.png"
		})
	}),
	new ol.layer.Tile({
		name: 'white',
		source: new ol.source.XYZ({
			url: 'http://api.vworld.kr/req/wmts/1.0.0/783D66F2-A36F-3995-B0D6-35F1429C1BFE/white/{z}/{y}/{x}.png'
		}),
		visible: false
	}),
	new ol.layer.Tile({
		name: 'midnight',
		source: new ol.source.XYZ({
			url: 'http://api.vworld.kr/req/wmts/1.0.0/783D66F2-A36F-3995-B0D6-35F1429C1BFE/midnight/{z}/{y}/{x}.png'
		}),
		visible: false
	}),
	new ol.layer.Tile({
		name: 'hybrid',
		source: new ol.source.XYZ({
			url: 'http://api.vworld.kr/req/wmts/1.0.0/783D66F2-A36F-3995-B0D6-35F1429C1BFE/Hybrid/{z}/{y}/{x}.png'
		}),
		visible: false
	}),
	new ol.layer.Tile({
		name: 'satellite',
		source: new ol.source.XYZ({
			url: 'http://api.vworld.kr/req/wmts/1.0.0/783D66F2-A36F-3995-B0D6-35F1429C1BFE/Satellite/{z}/{y}/{x}.jpeg'
		}),
		visible: false
	}),
];

//지도
const map = new ol.Map({
	target: 'map',
	layers: bgLayer,
	view: new ol.View({
	    projection: ol.proj.get('EPSG:3857'),
	    center: [14127388, 4517328],
	    zoom: 14
	}),
    loadTilesWhileAnimating: true,
	
});

// 위성지도 전환
$("[name=theme]").on("change", function() {
	let themeName = $(this).val();
	bgLayer.filter(layer => layer.get("name") === themeName).forEach(layer => layer.setVisible(true));
	bgLayer.filter(layer => layer.get("name") !== themeName).forEach(layer => layer.setVisible(false));
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
		side.css({"visibility":"visible", "width":"23%", "z-index":"99999"});
	}
}).trigger("click");
//});

$(".backBtn").on("click", function() {
	if (veil.hasClass("unveiled")) {
		veil.attr("class", "veiled");
		menu.addClass("bigMenu").removeClass("smallMenu");
		search.attr("class", "bigMenuSearch");
		inquire.removeClass("smallMenuBtn").addClass("bigMenuBtn");
		observe.removeClass("smallMenuBtn").addClass("bigMenuBtn");
		analyze.removeClass("smallMenuBtn").addClass("bigMenuBtn");
		history.removeClass("smallMenuBtn").addClass("bigMenuBtn");
		side.css({"visibility":"hidden", "width":"0%", "z-index":"1"});
	}	
});

// 사이드 메뉴
$(".sideHeader").on("click", function() {
	let menu = $(this).parent();
	let id = menu.attr("id");
	if (menu.hasClass("fold1")) {
		menu.removeClass("fold1").addClass("unfold1");
		if (id == "safety1") {
			menu.css("top", "20%");
			$("scContainer").show();
		} else if (id == "poi1") {
			menu.css("top", "30%");
		} else if (id == "cost1") {
			menu.css("top", "40%");
		}
		menu.children().not(".sideHeader").show();
	} else {
		menu.removeClass("unfold1").addClass("fold1");
		if (id == "safety1") {
			menu.css("top", "68%");
			$("scContainer").hide();
		} else if (id == "poi1") {
			menu.css("top", "78%");
		} else if (id == "cost1") {
			menu.css("top", "88%");
		}
		menu.children().not(".sideHeader").hide();
	}
});

// 레이어 지우기
function removeLayer(sor) {
	map.getLayers().getArray().filter(layer => layer.get("name") === sor)
		.forEach(layer => map.removeLayer(layer));
}

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

let emdLayer = null;

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
searchBtn1.on("click", function(event) {
	let adm_nm = $("#resultEmd").html();
	
	// base 빼고 읍면동 레이어 지우기
	removeLayer("adm_nm");
						
	// 해당 폴리곤 불러오기
	searchEmd(url, adm_nm);
	// 이동하기
	move(adm_nm);
	// 클릭 시 해당 읍면동 정보
	addInfo();
	
});


// 검색 조건에 따른 조회하기
// 나중에 코드로 바꿔주기 - vworld 법정동/행정동 이슈..
let amdSource;
function searchEmd(url, adm_nm) {
	amdSource = new ol.source.TileWMS({
		url : url,
		params : {
			layers : "Dukkeobi:mapogu_emd",
			styles : "search_emd",
			cql_filter : `adm_nm = '${adm_nm}'`,
			
		}
	});
	
	let layer = new ol.layer.Tile({
		name : "adm_nm",
		source : amdSource
	});
	map.addLayer(layer);
	
	
}

// 클릭 해당 읍면동 정보 - 스크롤 시 따라 움직이는 문제
const info = new ol.Overlay({
	element : document.querySelector("#info")
});
map.addOverlay(info);
function addInfo() {
	map.on('singleclick', function(event) {
		let coordinate = event.coordinate;
		let element = info.getElement();
		info.setPosition(coordinate);
		
	    let viewResolution = /** @type {number} */ (map.getView().getResolution());
	    let urll = amdSource.getGetFeatureInfoUrl(
	      	coordinate, viewResolution, 'EPSG:3857',
	      	{
			  'INFO_FORMAT': 'application/json',
			  'QUERY_LAYERS' : 'Dukkeobi:mapogu_emd'
				  });
		if (urll) {
			fetch(urll)
		    	.then((response) => response.json())
		    	.then((json) => {
					let content = json.features[0].properties.adm_nm;
					let popover = bootstrap.Popover.getInstance(element);
		            if (popover) {
		                popover.dispose();
		            }
		            popover = new bootstrap.Popover(element, {
		                  animation: false,
		                  container: element,
		                  content: `서울시 마포구 ${content}`,
		                  html: true,
		                  placement: 'top',
		                  title: '클릭한 위치',
		            });
		            popover.show();
		   		});
		}
	});
}

// 이동하기
function move(adm_nm) {
	fetch(`${context}/getXY?admNm=${adm_nm}`)
		.then(resp => resp.json())
		.then(json => {
			map.getView().setCenter([parseFloat(json.x), parseFloat(json.y)]);
			map.getView().setZoom(15);
		});
}

/* ===================srf-002=================== */
let safetySelect = $("#safetySelect");
let selectSido2 = safetySelect.children("select").first();
let selectSgg2 = $("#selectSgg2");
let selectEmd2 = safetySelect.children("select").last();
let scContainer = $("#scContainer");
let safetyTbody = $("#safetyTbody");

// 뭘 클릭했는지 저장하기
let clickList = [];

// 안전현황 레이어 추가/제거
$("input[name=safety]").on("click", function() {
	let safety = $(this);
	let id = safety.attr("id");
	if (safety.prop("type") == "checkbox") {
		if (safety.is(":checked")) {
			addSafety(url, id);
			safety.parent().css({"background-color":safety.parent().css("border-color"), "background-image":`url(${context}/resources/images/${id}2.svg)`});
			
			// 체크되어 있는 것만 넣고
			clickList.push(id);
		} else {
			removeLayer(id);
			safety.parent().css({"background-color":"", "background-image":`url(${context}/resources/images/${id}.svg)`});
			
			// 해제되면 삭제
			clickList = clickList.filter((checked) => checked !== id);
		}
	} else if (safety.prop("type") == "radio") {
		safety.parent().css({"background-color":safety.parent().css("border-color"), "background-image":`url(${context}/resources/images/${id}2.svg)`});
		let safeties = $("[name=safety]").not(":checked");
		$.each(safeties, function(index, safety) {
			$(safety).parent().css({"background-color":"", "background-image":`url(${context}/resources/images/${safety.id}.svg)`});
		});
	}
});

// 안전시설현황 레이어 추가
function addSafety(url, sor) {
	let layer;
	if (sor != "safetyTotal") {
		layer = new ol.layer.Tile({
			name : sor,
		 	source: new ol.source.TileWMS({
		   		url: url,
		   		params: {
					layers: "Dukkeobi:safety",
					styles: "safety_" + sor,
					cql_filter: `safety_sort = '${sor}'`
		         },
		 	}),
		});
	} else {
		layer = new ol.layer.Tile({
			name : sor,
		 	source: new ol.source.TileWMS({
		   		url: url,
		   		params: {
					layers: "Dukkeobi:safety",
					styles: "safety_" + sor,
		         },
		 	}),
		});
	}
	map.addLayer(layer);
}
/* ===================srf-003=================== */
// 목록 보기 버튼 눌렀을 때
$("#safetyListBtn").on("click", function() {
	let checked = $("[name=safety]:checked"); // 버튼을 눌렀을 때 체크된 것
	let endClick = clickList[clickList.length - 1];
	let list = $("#safetyList");
	// 목록이 안 보일 때 => 보여주기
	if (list.css("visibility") == "hidden") {
		list.css({"left":"25%", "width":"74%", "padding":"4%", "visibility":"visible"});
		list.children().show();
		
		// 목록 보여준 후 메뉴는 라디오 버튼으로 바꾸기
		scContainer.find("input").attr("type", "radio");
		
		// 목록 보기를 누르기 전, 여러 checkbox의 모양이 활성화되어 있을 수 있음
		// 그때 radio로 바뀌면서 한 가지만 활성화되게 해야 함
		let checkedId = checked.attr("id");
		let safeties = $("[name=safety]");

		// 선택된 게 없다면 전체로 고정, 있다면 그것 빼고 전체 보여주기
		if (checkedId == null || typeof checkedId == "undefined" || checkedId == "" || checkedId == "safetyTotal") {
			endClick = "safetyTotal";
			let safetyTotal = $("#safetyTotal");
			safetyTotal.prop("checked", true);
			// 활성화되어 있는 것이 없으니 전체만 모양을 변경해주면 된다.(다른 것은 원래의 모습 그대로일 테니)
			safetyTotal.parent().css({"background-color":safetyTotal.parent().css("border-color"), "background-image":`url(${context}/resources/images/safetyTotal2.svg)`});
		} else {
		// 여러 가지가 선택되어 있다면..
			// radio로 바뀌고 마지막으로 선택된 것 말고 다른 것들 모두 비활성화 상태의 이미지로 돌리기
			$.each(safeties, function(index, safety) {
				if (safety.id != endClick) {
					$(safety).parent().css({"background-color":"", "background-image": `url(${context}/resources/images/${safety.id}.svg)`});
				}
			});
		}
		
		// 마지막으로 체크된 것 or 전체 보여주기
		addSafetyList(endClick);
		
		// 라디오 박스 바꾸면 그거에 맞는 거 보여주기. -> 이거 addSafetyList()에 넣어야 하나? XX 누른 만큼 개수 생김
		$("[name=safety]").on("change", function() {
			// 목록 띄우기
			addSafetyList($(this).attr("id"));
		});
	} else {
	// 목록이 보일 때 => 숨겨주기
		list.children().hide();
		list.css({"width":"0%", "padding":"0%", "visibility":"hidden"});
		let safeties = $("[name=safety]").attr("type", "checkBox").off("change");
		// 포인트 layer 다 지워주기
		$.each(safeties, function(index, safety) {
			if (safety.id != endClick) {
				removeLayer(safety.id);
			}
		});
		if (checked[0].id == "safetyTotal") {
			$("#safetyTotal").parent().css({"background-color":"", "background-image": `url(${context}/resources/images/safetyTotal.svg)`})
		}
	}
});
 
// 시군구 select
makeOptionTag(selectSido2[0], sidoList);
makeOptionTag(selectSgg2[0], sggList);
makeOptionTag(selectEmd2[0], emdList);

// 안전현황 태그 만들기
function makeSafetyTbodyTag(safety) {
	return $("<tr>").append(
		$("<td>").html(safety.safetyGubun)
		, $("<td>").html(safety.safetyCode)
		, $("<td>").html(safety.safetyNm)
		, $("<td>").html(safety.safetyAddr)
		, $("<td>").append(
			$("<input>").val(safety.gid).attr("type", "hidden")
			, $("<input>").val(safety.safetySort).attr("type", "hidden")
			, $("<button>").html("수정").addClass("btn btn-secondary safetyModify")
			, $("<button>").html("삭제").addClass("btn btn-danger safetyRemove")
		)
	);
}
// 안전현황 목록 띄우기
function addSafetyList(sort) {
	safetyTbody.empty();
	$.ajax({
		url : `${context}/safety?sort=${sort}`,
		success: function(list) {
			let tbodyTag = [];
			$.each(list, function(index, safety){
				if (index < 7) {
					tbodyTag.push(makeSafetyTbodyTag(safety));
				}
			});
			safetyTbody.html(tbodyTag);
		},
		error : function(jqXHR, status, error) {
			console.log(jqXHR);
			console.log(status);
			console.log(error);
		}
	}).then(() => {
		$(".safetyModify").on("click", function() {
			let gid = $(this).siblings("input").val();
		});
		// 안전현황 지우기
		$(".safetyRemove").on("click", function() {
			safetyRemove(this);
		});
	});
	
}

// 안전현황 등록 폼 띄우기
let safetyWindow;
function safetyForm() {
	safetyWindow = window.open(context + '/safety/form', '안전현황 등록', 'width=500px,height=750px,scrollbars=no');
}

// 안전현황 지우기
function safetyRemove(button) {
	let gid = parseInt($(button).siblings("input").first().val());
	let sort = $(button).siblings("input").last().val();
	$.ajax({
		url : `${context}/safety?gid=${gid}`,
		method : "delete",
		success : function() {
			addSafetyList(sort);
			$("input[name=safety]:checked").prop("checked", false);
			$("#" + sort).prop("checked", true);
		},
		error : function(jqXHR, status, error) {
			console.log(jqXHR);
			console.log(status);
			console.log(error);
		}
	});	
}

// 주거적지 조건 설정 메뉴
$("#observe").on("click", function() {
	if($("#cSide").css("visibility") == "hidden") {
		$("#cSide").css({"visibility":"visible", "width":"23%", "z-index":"99999"}).show();
		$("#side").hide();
	} else {
		$("#cSide").css({"visibility":"hidden", width:"0%", "z-index":"0"}).hide();
		$("#side").show();
	}
});

// 사이드 메뉴 목록 태그 만들기
function makeCTbodyTag(index, cond) {
	return $("<tr>").append(
		$("<td>").html(index + 1),
		$("<td>").html(cond.condNm),
		$("<td>").html(cond.condDate),
		$("<td>").html("ㅇ")
	);
}
function makeCListTbodyTag(index, cond) {
	return $("<tr>").append(
		$("<td>").html(index + 1),
		$("<td>").html(cond.condNm).addClass("condNm").val(cond.condNo),
		$("<td>").html(cond.condEmd),
		$("<td>").html(cond.condDate),
		$("<td>").html("ㅇ")
	);
}

let cTbody = $("#cTbody");
let cListTbody = $("#cListTbody");
// 사이드 메뉴의 목록
function addCTbody() {
	cTbody.empty();
	cListTbody.empty();
	$.ajax({
		url : `${context}/cond`,
		success: function(list) {
			let cTbodyTag = [];
			let cListTbodyTag = [];
			$.each(list, function(index, cond){
				if (index < 5) {
					cTbodyTag.push(makeCTbodyTag(index, cond));
				}
				cListTbodyTag.push(makeCListTbodyTag(index, cond));
			});
			cTbody.html(cTbodyTag);
			cListTbody.html(cListTbodyTag);
		},
		error : function(jqXHR, status, error) {
			console.log(jqXHR);
			console.log(status);
			console.log(error);
		}
	}).then(() => {
		// 주거적지 설정 목록
		$(".showList").on("click", function() {
			let cdContainer = $("#cdContainer");
			if (cdContainer.css("visibility") == "hidden") {
				cdContainer.css({"visibility":"visible", "width":"74%", "padding":"4%"}).show();
			} else {
				cdContainer.css({"visibility":"hidden", "width":"0%", "padding":"0%"}).hide();
			}
		});
		
		// 세부 내역 보기
		$(".condNm").on("click", function() {
			let condNo = $(this).val();
			let cListTable = $("#cListTable");
			let cDetailTable = $("#cDetailTable");
			let cSideHeader = cListTable.prev();
			if (!cSideHeader.hasClass("opened")) {
				cListTable.css({"visibility":"hidden", "width":"0%"}).hide();
				cDetailTable.css({"visibility":"visible", "width":"100%"}).show();
				
				addCDetail(condNo);
				
				cSideHeader.html("주거적지 설정 목록 > " + $(this).html()).addClass("opened").on("click", function() {
					cDetailTable.css({"visibility":"hidden", "width":"0%"}).hide();
					cListTable.css({"visibility":"visible", "width":"100%"}).show();
					cSideHeader.html("주거적지 설정 목록").removeClass("opened");
				});
			}
			
			
		});
	});
}
addCTbody();

// 조건 설정 창
$("#condition").on("click", function() {
	let cContainer = $("#cContainer");
	let cGrid = $("#cGrid");
	if (cContainer.css("visibility") == "hidden") {
		cContainer.css({"visibility":"visible", "width":"74%", "padding":"4%"});
		cGrid.children().css({"visibility":"visible", "height":"90%"}).show();
		if ($("[name=cCourses]").find(":checked").length < 1) {
			$.each($(".cCourses"), function(index, course) {
				$("#" + course.children[0].id + "Detail").hide();
				$(course).css("font-size", "1.5rem");
			});
			$("#area").prop("checked", true).parent().css("font-size", "2.5rem");
			$("#areaDetail").show();
		}
		$("#condBtn").show();
	} else {
		cContainer.css({"visibility":"hidden", "width":"0%", "padding":"0%"});
		cGrid.children().css({"visibility":"visible", "height":"0%"}).hide();
		$("#condBtn").hide();
	}
});

// 조건 선택 시 해당 조건 설정 서식이 나옴
$(".cCourses").on("change", function() {
	$.each($(".cCourses"), function(index, course) {
		$(course).css("font-size", "1.5rem");
		$("#" + course.children[0].id + "Detail").hide();
	});
	$(this).css("font-size", "2.5rem");
	$("#" + this.children[0].id + "Detail").show();
});

// 탐색 범위 조건
$("#areaMin").html($("#areaRange").attr("min"));
$("#areaMax").html($("#areaRange").attr("max"));
$("#value1").html(1500);
let cSelectSido = document.querySelector("#cSelectSido");
let cSelectSgg = document.querySelector("#cSelectSgg");
let cSelectEmd = document.querySelector("#cSelectEmd");
makeOptionTag(cSelectSido, sidoList);
makeOptionTag(cSelectSgg, sggList);
makeOptionTag(cSelectEmd, emdList);

// 조건 저장 버튼 누를 때
$("#condSave").on("click", function() {
	$("#condForm").submit();
});

// 조건 폼태그가 전송될 때
$("#condForm").on("submit", function(event) {
	event.preventDefault();
	
	let cond = $(this).serialize();
	
	$.ajax({
		url: `${context}/cond`,
		method: "post",
		data: cond,
		success: function(){
			addCTbody();
		},
		error : function(jqXHR, status, error) {
			console.log(jqXHR);
			console.log(status);
			console.log(error);
		}		
	});
	
	return false;
});

// 조건 분류하기
function sorting(cond) {
	let tds = ["지하철", "버스", "택시", "자전거", "도보"];
	let cds = ["백화점", "마트", "편의점", "외부화장실", "영화관", "운동시설", "노래방", "영화관"];
	let mds = ["병원", "약국", "보건소", "요양소"];
	let ads = ["행정복지센터", "구청", "시청", "공기업", "정부기관"];
	let sds = ["대학교", "고등학교", "중학교", "초등학교", "유치원", "학원", "평생교육원"];
	let nds = ["가로수", "공원", "숲", "산", "하천"];
	
	let traffics = [];
	let convis = [];
	let medicals = [];
	let admins = [];
	let schools = [];
	let natures = [];
	
	let details = cond.condDetails.split(",");
	for (let i = 0; i < details.length; i++) {
		if (tds.includes(details[i])) {
			traffics.push(details[i]);
		} else if (cds.includes(details[i])) {
			convis.push(details[i]);
		} else if (mds.includes(details[i])) {
			medicals.push(details[i]);
		} else if (ads.includes(details[i])) {
			admins.push(details[i]);
		} else if (sds.includes(details[i])) {
			schools.push(details[i]);
		} else if (nds.includes(details[i])) {
			natures.push(details[i]);
		}
	}
	
	let sorted = {
		traffics : traffics,
		convis : convis,
		medicals : medicals,
		admins : admins,
		schools : schools,
		natures : natures
	};
	
	return sorted;
}

// 상세 정보 태그 만들기
function cDetailTag(cond) {
	let sorted = sorting(cond);
	let tags = [];
	tags.push($("<h1>").attr("id", "condNm4").html(cond.condNm).val(cond.condNo));
	tags.push($("<hr>"));
	tags.push($("<h2>").html("상세 정보"));
	tags.push($("<div>").html("작성일 : " + cond.condDate));
	tags.push($("<div>").html("지정동 : " + cond.condEmd));
	tags.push($("<div>").html("반경 : " + cond.condRange));
	tags.push($("<hr>"));
	tags.push($("<div>").html("교통 조건 : " + sorted.traffics));
	tags.push($("<div>").html("편의 조건 : " + sorted.convis));
	tags.push($("<div>").html("의료 조건 : " + sorted.medicals));
	tags.push($("<div>").html("공공 조건 : " + sorted.admins));
	tags.push($("<div>").html("학군 조건 : " + sorted.schools));
	tags.push($("<div>").html("자연 조건 : " + sorted.natures));
	tags.push($("<button>").html("수정하기").addClass("btn btn-secondary"));
	tags.push($("<button>").html("분석하기").addClass("btn btn-primary").attr("id", "condAnal").val(cond.condNo));
	return  tags;
}
// 조건 상세 정보
function addCDetail(condNo) {
	$("#cDetailTable").empty();
	$.ajax({
		url: `${context}/cond/getCond?condNo=${condNo}`,
		method: "get",
		success: function(cond){
			$("#cDetailTable").append(cDetailTag(cond));
		},
		error : function(jqXHR, status, error) {
			console.log(jqXHR);
			console.log(status);
			console.log(error);
		}		
	}).then(() => {
		$("#condAnal").on("click", function() {
			$("#cdContainer").hide();
			$("#cSide").hide();
			$("#aSide").css({"visibility":"visible", "width":"23%"}).show();
		});
	});
}

$("#analyze").on("click", function() {
	if ($("#aSide").css("visibility") == "hidden") {
		$("#side").hide();
		$("#aSide").css({"visibility":"visible", "width":"23%", "z-index":"99999"}).show();
	} else {
		$("#aSide").css({"visibility":"hidden", "width":"0%", "z-index":"1"}).hide();
		$("#side").show();
	}
});