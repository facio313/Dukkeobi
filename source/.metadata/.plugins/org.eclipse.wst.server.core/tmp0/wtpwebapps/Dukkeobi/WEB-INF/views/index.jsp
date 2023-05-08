<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form"%>
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">
<title>두꺼비 : 새집 다오</title>

<c:set value="${pageContext.request.contextPath}" var="context"/>

<link rel="stylesheet" href="${context}/resources/js/bootstrap-5.2.3-dist/css/bootstrap.min.css">    
<link rel="stylesheet" href="${context}/resources/js/ol/ol.css">
<link rel="stylesheet" href="${context}/resources/css/index.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css">
<link rel="shortcut icon" href="#">

</head>
<body>
<input type="hidden" value="${context}" id="context">

<!-- 지도 -->
<div id="map"></div>

<!-- 배경장막 -->
<div id="veil" class="veiled"></div>

<!-- 대메뉴 -->
<div id="menu" class="tile bigMenu">
	<input type="text" id="search" class="bigMenuSearch" placeholder="키워드로 검색하기"/>
	<button id="inquire" class="menuBtn bigMenuBtn">주거 현황 조회</button>
	<button id="observe" class="menuBtn bigMenuBtn">주거적지 탐색</button>
	<button id="analyze" class="menuBtn bigMenuBtn">주거적지 분석</button>
	<button id="history" class="menuBtn bigMenuBtn">찜한 분석 결과</button>		
</div>

<!-- 기본 사이드 메뉴 -->
<div id="side" class="tile">
	<button class="backBtn">←</button>
	<div id="search1" class="tile sideMenu unfold1">
		<div class="sideHeader">지역선택</div>
		<select class="form-control selectForm"></select>
		<select id="selectSgg" class="form-control selectForm"></select>
		<select class="form-control selectForm"></select>
		<div class="resultForm">
			선택한 주소 : 
			<span id="resultSido">시/도 </span>
			<span id="resultSgg">시/군/구</span>
			<span id="resultEmd">읍/면/동</span>
		</div>
		<button id="removeBtn1" class="btn btn-danger searchBtn">지우기</button>
		<button id="searchBtn1" class="btn btn-primary searchBtn">검색</button>
	</div>
	<div id="safety1" class="tile sideMenu fold1">
		<div class="sideHeader">주요지점</div>
		<div id="scContainer">
			<label id="totalIcon" class="safetyLabel" for="safetyTotal">
				<input name="safety" type="checkBox" id="safetyTotal">
				<span class="iconText">전체</span>
			</label>
			<label id="publicIcon" class="safetyLabel">
				<input name="safety" type="checkBox" id="public">
				<span class="iconText">공공</span>
			</label>
			<label id="eduIcon" class="safetyLabel">
				<input name="safety" type="checkBox" id="edu">
				<span class="iconText">교육</span>
			</label>
			<label id="healthIcon" class="safetyLabel">
				<input name="safety" type="checkBox" id="health">
				<span class="iconText">보건</span>
			</label>
			<label id="conviIcon" class="safetyLabel">
				<input name="safety" type="checkBox" id="convi">
				<span class="iconText">편의</span>
			</label>
			<label id="safeIcon" class="safetyLabel">
				<input name="safety" type="checkBox" id="safe">
				<span class="iconText">안전</span>
			</label>
			<label id="natureIcon" class="safetyLabel">
				<input name="safety" type="checkBox" id="nature">
				<span class="iconText">자연</span>
			</label>
		</div>
		<button id="safetyListBtn" class="btn btn-primary">목록보기</button>
	</div>
	<div id="poi1" class="tile sideMenu fold1">
		<div class="sideHeader">안전현황</div>
		<div id="poiContainer">
			<label id="poiTotalIcon" class="poiLabel" for="poiTotal">
				<input name="poi" type="checkBox" id="poiTotal">
				<span class="iconText">전체</span>
			</label>
			<label id="trafficIcon" class="poiLabel">
				<input name="poi" type="checkBox" id="traffic">
				<span class="iconText">교통</span>
			</label>
			<label id="disasterIcon" class="poiLabel">
				<input name="poi" type="checkBox" id="disaster">
				<span class="iconText">재난</span>
			</label>
			<label id="policeIcon" class="poiLabel">
				<input name="poi" type="checkBox" id="police">
				<span class="iconText">치안</span>
			</label>
			<label id="unhealthIcon" class="poiLabel">
				<input name="poi" type="checkBox" id="unhealth">
				<span class="iconText">보건</span>
			</label>
			<label id="accidentIcon" class="poiLabel">
				<input name="poi" type="checkBox" id="accident">
				<span class="iconText">사고</span>
			</label>
		</div>
		<button id="poiListBtn" class="btn btn-primary">목록보기</button>
	</div>
	<div id="cost1" class="tile sideMenu fold1">
		<div class="sideHeader">실거래가</div>
		<div id="reContainer">
			<label id="reTotalIcon" class="reLabel" for="reTotal">
				<input name="re" type="checkBox" id="reTotal">
				<span class="iconText">전체</span>
			</label>
			<label id="ajIcon" class="reLabel">
				<input name="re" type="checkBox" id="aj">
				<span class="iconText">아파트(전)</span>
			</label>
			<label id="awIcon" class="reLabel">
				<input name="re" type="checkBox" id="aw">
				<span class="iconText">아파트(월)</span>
			</label><br>
			<label id="ojIcon" class="reLabel">
				<input name="re" type="checkBox" id="oj">
				<span class="iconText">오피스텔(전)</span>
			</label>
			<label id="owIcon" class="reLabel">
				<input name="re" type="checkBox" id="ow">
				<span class="iconText">오피스텔(월)</span>
			</label><br>
			<label id="yjIcon" class="reLabel">
				<input name="re" type="checkBox" id="yj">
				<span class="iconText">연립(전)</span>
			</label>
			<label id="ywIcon" class="reLabel">
				<input name="re" type="checkBox" id="yw">
				<span class="iconText">연립(월)</span>
			</label>
		</div>
		<button id="reListBtn" class="btn btn-primary">목록보기</button>
	</div>
</div>

<!-- 안전현황 -->
<div id="safetyList" class="tile">
	<div class="sideHeader">주거 현황 조회</div>
	<input type="text" id="safetySearch" placeholder="키워드로 검색하기"/>
	<div id="safetySelect">
		<select class="form-control safetySelect"></select>
		<select id="selectSgg2" class="form-control safetySelect"></select>
		<select class="form-control safetySelect"></select>
		<button id="safetyEmd" class="btn btn-primary">지도로 보기</button>
		<button id="safetyAdd" onclick="safetyForm()" class="btn btn-primary">등록하기</button>
	</div>
	<div>
		<table class="table table-hover">
	        <colgroup>
	            <col width=10%>
	            <col width=20%>
	            <col width=25%>
	            <col width=30%>
	            <col width=15%>
	        </colgroup>			
			<thead>
				<tr>
					<th>분류</th>
					<th>상세분류</th>
					<th>이름</th>
					<th>도로명 주소</th>
					<th></th>
				</tr>
			</thead>
			<tbody id="safetyTbody">
				
			</tbody>
			<tfoot>
			
			</tfoot>
		</table>
	</div>
</div>

<!-- 실거래가 -->
<div id="reList" class="tile">
	<div class="sideHeader">주거 현황 조회</div>
	<input type="text" id="reSearch" placeholder="키워드로 검색하기"/>
	<div id="reSelect">
		<select class="form-control reSelect"><option>서울특별시</option></select>
		<select id="selectSgg2" class="form-control safetySelect"><option>마포구</option></select>
		<select class="form-control safetySelect"><option>읍/면/동</option></select>
		<button id="reEmd" class="btn btn-primary">지도로 보기</button>
		<button id="reAdd" onclick="reForm()" class="btn btn-primary">등록하기</button>
	</div>
	<div>
		<table class="table table-hover">
	        <colgroup>
	            <col width=5%>
	            <col width=40%>
	            <col width=25%>
	            <col width=5%>
	            <col width=5%>
	            <col width=10%>
	            <col width=10%>
	        </colgroup>			
			<thead>
				<tr>
					<th></th>
					<th>주소</th>
					<th>단지</th>
					<th>층</th>
					<th>구분</th>
					<th>보증금</th>
					<th>월세</th>
				</tr>
			</thead>
			<tbody id="reTbody">
				
			</tbody>
			<tfoot>
			
			</tfoot>
		</table>
	</div>
</div>

<!-- 배경지도 주제도 -->
<div id="control" class="tile">
	<label class="onOff" id="base"><input type="radio" name="theme" value="base" checked>기본</label>
	<label class="onOff" id="white"><input type="radio" name="theme" value="white">밝음</label>
	<label class="onOff" id="midnight"><input type="radio" name="theme" value="midnight">어두움</label>
	<label class="onOff" id="hybrid"><input type="radio" name="theme" value="hybrid">하이브리드</label>
	<label class="onOff" id="satellite"><input type="radio" name="theme" value="satellite">위성</label>
</div>

<!-- 오버레이 -->
<div id="info" class="tile" title="클릭한 위치"></div>

<!-- 주거적지 조건 사이드 메뉴 -->
<div id="cSide" class="tile">
	<div class="sideHeader">주거적지 탐색</div>
	<div id="condition" class="tile">
		<div>
		</div>
		<h1>+</h1>
		<div>
			<h4>새로운 주거적지 탐색</h4>
			<h6>조건을 추가하세요!</h6>
		</div>
	</div>
	<div class="sideHeader">주거적지 설정 내역</div>
	<button class="btn btn-primary showList">목록</button>
	<div id="cList" class="tile">
		<table class="table table-hover">
	        <colgroup>
	            <col width=5%>
	            <col width=40%>
	            <col width=30%>
	            <col width=25%>
	        </colgroup>			
			<thead>
				<tr>
					<th></th>
					<th>저장명</th>
					<th>작성날짜</th>
					<th>분석여부</th>
				</tr>
			</thead>
			<tbody id="cTbody">
				
			</tbody>
			<tfoot>
			
			</tfoot>
		</table>
	</div>
</div>

<!-- 주거적지 조건 컨테이너 -->
<div id="cContainer" class="tile">
	<div class="sideHeader">주거적지 탐색</div>
	<div id="cGrid">
		<div id="cCourse" class="tile">
			<label class="cCourses"><input type="radio"  name="cCourses" id="area" value="area">탐색범위</label>
			<label class="cCourses"><input type="radio"  name="cCourses" id="re" value="re">주거유형</label>
			<label class="cCourses"><input type="radio"  name="cCourses" id="traffic" value="traffic">교통</label>
			<label class="cCourses"><input type="radio"  name="cCourses" id="convi" value="convi">편의</label>
			<label class="cCourses"><input type="radio"  name="cCourses" id="medical" value="medical">보건</label>
			<label class="cCourses"><input type="radio"  name="cCourses" id="admin" value="admin">공공</label>
			<label class="cCourses"><input type="radio"  name="cCourses" id="school" value="school">학군</label>
			<label class="cCourses"><input type="radio"  name="cCourses" id="nature" value="nature">자연</label>
		</div>
		<div id="cDetail">
			<form:form modelAttribute="cond" action="${context}/cond" method="post" id="condForm">
				<div id="areaDetail" class="details">
					<div class="sideHeader">탐색 조건의 저장명을 입력하세요.</div>
					<form:input type="text" cssClass="form-control" path="condNm" placeholder="ex) **동 교통만"/>
					<div class="sideHeader">탐색 조건이 검색될 범위를 정해주세요.</div>
					<div id="select4">
						<select id="cSelectSido" class="form-control cSelectForm"></select>
						<select id="cSelectSgg" class="form-control cSelectForm"></select>
						<select id="cSelectEmd" name="condEmd" class="form-control cSelectForm"></select>					
					</div>
					<input id="areaRange" type="range" name="condRange" value="${not empty condRange ? condRange : 1500}" step="100" min="500" max="3000" oninput="document.getElementById('value1').innerHTML=this.value;">
					<div id="areaDiv">
						<span id="areaMin"></span>
						<span id="areaMax"></span>
					</div>
					<span class="bold">지정된 최대 검색 범위 : </span><span id="value1"></span><span>m</span>
				</div>
				<div id="reDetail" class="condDetails">
					<div class="sideHeader">실거래가 조건을 설정해주세요.</div>
					<label><form:checkbox path="condRe" value="aj"/>아파트(전)</label>
					<label><form:checkbox path="condRe" value="aw"/>아파트(월)</label>
					<label><form:checkbox path="condRe" value="oj"/>오피스텔(전)</label>
					<label><form:checkbox path="condRe" value="ow"/>오피스텔(월)</label>
					<label><form:checkbox path="condRe" value="yj"/>연립다세대(전)</label>
					<label><form:checkbox path="condRe" value="yw"/>연립다세대(월)</label>
					<input id="areaRange" type="range" name="condReRange1" value="${not empty condRange ? condRange : 1000}" step="100" min="0" max="20000" oninput="document.getElementById('value2').innerHTML=this.value;">
					<div id="areaDiv">
						<span id="areaMin">0</span>
						<span id="areaMax">20000(2억)</span>
					</div>
					<input id="areaRange" type="range" name="condReRange2" value="${not empty condRange ? condRange : 50}" step="1" min="0" max="100" oninput="document.getElementById('value3').innerHTML=this.value;">
					<div id="areaDiv">
						<span id="areaMin">0</span>
						<span id="areaMax">100(만원)</span>
					</div>
					<span class="bold">지정된 최대 보증금 : </span><span id="value2"></span><span>만원</span>
					<span class="bold">지정된 최대 월세 : </span><span id="value3"></span><span>만원</span>
				</div>
				<div id="trafficDetail" class="condDetails">
					<div class="sideHeader">교통 조건을 설정해주세요.</div>
					<label><form:checkbox path="condDetails" value="지하철"/>지하철</label>
					<label><form:checkbox path="condDetails" value="버스"/>버스</label>
					<label><form:checkbox path="condDetails" value="택시"/>택시</label>
					<label><form:checkbox path="condDetails" value="자전거"/>자전거</label>
					<label><form:checkbox path="condDetails" value="도보"/>도보</label>
				</div>
				<div id="conviDetail" class="condDetails">
					<div class="sideHeader">편의시설 조건을 설정해주세요.</div>
					<label><form:checkbox path="condDetails" value="백화점"/>백화점</label>
					<label><form:checkbox path="condDetails" value="마트"/>마트</label>
					<label><form:checkbox path="condDetails" value="편의점"/>편의점</label>
					<label><form:checkbox path="condDetails" value="외부화장실"/>외부화장실</label>
					<label><form:checkbox path="condDetails" value="영화관"/>영화관</label>
					<label><form:checkbox path="condDetails" value="운동시설"/>운동시설</label>
					<label><form:checkbox path="condDetails" value="노래방"/>노래방</label>
					<label><form:checkbox path="condDetails" value="PC방"/>PC방</label>
				</div>
				<div id="medicalDetail" class="condDetails">
					<div class="sideHeader">보건/의료 조건을 설정해주세요.</div>
					<label><form:checkbox path="condDetails" value="병원"/>병원</label>
					<label><form:checkbox path="condDetails" value="약국"/>약국</label>
					<label><form:checkbox path="condDetails" value="보건소"/>보건소</label>
					<label><form:checkbox path="condDetails" value="요양소"/>요양소</label>
				</div>
				<div id="adminDetail" class="details">
					<div class="sideHeader">공공기관 조건을 설정해주세요.</div>
					<label><form:checkbox path="condDetails" value="행정복지센터"/>행정복지센터</label>
					<label><form:checkbox path="condDetails" value="구청"/>구청</label>
					<label><form:checkbox path="condDetails" value="시청"/>시청</label>
					<label><form:checkbox path="condDetails" value="공기업"/>공기업</label>
					<label><form:checkbox path="condDetails" value="정부기관"/>정부기관</label>
				</div>
				<div id="schoolDetail" class="details">
					<div class="sideHeader">학군 조건을 설정해주세요.</div>
					<label><form:checkbox path="condDetails" value="대학교"/>대학교</label>
					<label><form:checkbox path="condDetails" value="고등학고"/>고등학교</label>
					<label><form:checkbox path="condDetails" value="중학교"/>중학교</label>
					<label><form:checkbox path="condDetails" value="초등학교"/>초등학교</label>
					<label><form:checkbox path="condDetails" value="유치원"/>유치원</label>
					<label><form:checkbox path="condDetails" value="학원"/>학원</label>
					<label><form:checkbox path="condDetails" value="평생교육원"/>평생교육원</label>
				</div>
				<div id="natureDetail" class="details">
					<div class="sideHeader">자연 조건을 설정해주세요.</div>
					<label><form:checkbox path="condDetails" value="가로수"/>가로수</label>
					<label><form:checkbox path="condDetails" value="공원"/>공원</label>
					<label><form:checkbox path="condDetails" value="숲"/>숲</label>
					<label><form:checkbox path="condDetails" value="산"/>산</label>
					<label><form:checkbox path="condDetails" value="하천"/>하천</label>
				</div>
				<input id="condResett" type="reset" value="리셋">
			</form:form>
		</div>
	</div>
	<div id="condBtn">
		<button id="condReset" class="btn btn-secondary" onclick='$("#condResett").trigger("click")'>초기화</button>
		<button id="condSave" class="btn btn-primary">저장</button>
	</div>
</div>

<!-- 주거적지 조건 세부 -->
<div id="cdContainer" class="tile">
	<div class="sideHeader">주거적지 설정 목록</div>
	<div id="cListTable">
		<table class="table table-hover">
	        <colgroup>
	            <col width=5%>
	            <col width=50%>
	            <col width=15%>
	            <col width=15%>
	            <col width=15%>
	        </colgroup>			
			<thead>
				<tr>
					<th></th>
					<th>저장명</th>
					<th>지정 읍면동</th>
					<th>작성날짜</th>
					<th>분석여부</th>
				</tr>
			</thead>
			<tbody id="cListTbody">
				
			</tbody>
			<tfoot>
			
			</tfoot>
		</table>		
	</div>
	<div id="cDetailTable">
	
	</div>
</div>

<!-- 주거적지 분석 사이드 -->
<div id="aSide" class="tile">
	<div class="sideHeader">주거적지 분석</div>
	<div id="aCond" class="tile">
		<h4>새로운 주거적지 분석</h4>
		<h6>주거적지 탐색 메뉴에서 조건을 정해주세요</h6>
	</div>
	<div class="sideHeader">주거적지 분석 간략</div>
	<button id="showResult" class="btn btn-primary showDetail">상세</button>
	<div id="aList" class="tile">
		<table class="table table-hover">
	        <colgroup>
	            <col width=15%>
	            <col width=65%>
	            <col width=15%>
	        </colgroup>			
			<thead>
				<tr>
					<th>순위</th>
					<th>건물</th>
					<th>점수</th>
				</tr>
			</thead>
			<tbody id="aTbody">
				
			</tbody>
			<tfoot>
			
			</tfoot>
		</table>
	</div>
</div>

<div id="rContainer" class="tile">
	<div class="sideHeader">주거적지 분석 결과</div>
	<div id="rListTable">
		<table class="table table-hover">
	        <colgroup>
	            <col width=15%>
	            <col width=28%>
	            <col width=28%>
	            <col width=28%>
	        </colgroup>			
			<thead id="rThead">
				<tr>
					<th></th>
					<th>danji1</th>
					<th>danji2</th>
					<th>danji3</th>
				</tr>
			</thead>
			<tbody id="rTbody">
				<tr>
					<th>주소</th>
					<td>서울특별시 마포구 상암동 1734</td>
					<td>서울특별시 마포구 상암동 1660</td>
					<td>서울특별시 마포구 상암동 1689</td>
				</tr>
				<tr>
					<th>총점<br>(만점 :100점)</th>
					<td>62.25</td>
					<td>50</td>
					<td>49</td>
				</tr>
				<tr>
					<th>거래정보</th>
					<td>전세 평균 16433 / 4</td>
					<td>전세 평균 11433 / 7</td>
					<td>전세 평균 21495 / 0</td>
				</tr>
				<tr>
					<th></th>
					<td>월세 평균 1293 / 65</td>
					<td>월세 평균 796 / 69</td>
					<td>월세 평균 2345 / 64</td>
				</tr>
				<tr>
					<th>500m 내 지하철</th>
					<td>수색역(경의중앙), 디지털미디어시티역(6)</td>
					<td>수색역(경의중앙)</td>
					<td>없음</td>
				</tr>
				<tr>
					<th>500m 내 편의점</th>
					<td>CU 마포 상암점, GS25 디지털미디어시티점, GS25 하늘숲공원점, ...</td>
					<td>GS25 수색역점, CU 수색역점, CU MBC앞점, ...</td>
					<td>7Eleven 마포 상암중앙점, CU 오벨리스크점, ...</td>
				</tr>
				<tr>
					<th>500m 내 병원</th>
					<td>길 정형외과, 사랑성모내과, 미의원, 웰니스 치질 전문 병원, ...</td>
					<td>아름다운 피부과, 김내과, 바른e치과, 상암성형외과</td>
					<td>최길자 가정의학과, 리빙인 의원, 감봉숙 정형외과</td>
				</tr>
			</tbody>
			<tfoot>
			
			</tfoot>
		</table>		
	</div>
	<div id="cDetailTable">
	
	</div>
</div>

<div id="hContainer" class="tile">
	<div class="sideHeader">주거적지 목록</div>
	<div id="hListTable">
		<table class="table table-hover">
	        <colgroup>
	            <col width=5%>
	            <col width=20%>
	            <col width=35%>
	            <col width=5%>
	            <col width=5%>
	            <col width=5%>
	            <col width=15%>
	            <col width=10%>
	        </colgroup>			
			<thead id="hThead">
				<tr>
					<th></th>
					<th>단지명</th>
					<th>주소</th>
					<th>총점</th>
					<th>순위</th>
					<th>표준점수</th>
					<th>분석날짜</th>
					<th></th>
				</tr>
			</thead>
			<tbody id="hTbody">
			
			</tbody>
			<tfoot>
			
			</tfoot>
		</table>		
	</div>
	<div id="hDetailTable">
	
	</div>
</div>



<script src="${context}/resources/js/ol/ol.js"></script>
<script src="${context}/resources/js/ol/jsts.min.js"></script>
<script src="${context}/resources/js/ol/proj4js-2.3.14.js"></script>
<script src="${context}/resources/js/jquery-3.6.1.min.js"></script>
<script src="${context}/resources/js/index.js"></script>
<script src="${context}/resources/js/bootstrap-5.2.3-dist/js/bootstrap.bundle.min.js"></script>

<script>

</script>

</body>
</html>