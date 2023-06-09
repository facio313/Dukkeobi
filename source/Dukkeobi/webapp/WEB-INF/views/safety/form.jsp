<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>안전현황 등록</title>
<link rel="stylesheet" href="${context}/resources/js/bootstrap-5.2.3-dist/css/bootstrap.min.css">
<style>

</style>
</head>
<body style="padding-top: 10%; padding-left: 5%; padding-right: 5%;">
<h1>안전현황 등록</h1>
<div>
	<button class="btn btn-light btn-sm" style="position: relative; left: 70%;">지도에서 등록</button>
	<h5 style="margin-top: 5%;, margin-bottom: 2%;">등록한 안전현황을 입력하세요</h5>
	<form:form modelAttribute="safety" action="${pageContext.request.contextPath}/safety" method="post" id="form">
		<table class="table table-sm table-hover">
			<tbody>
				<tr>
					<th></th>
					<td></td>
				</tr>
				<tr>
					<th>대분류</th>
					<td>
						<form:select path="safetySort" cssClass="form-control">
							<form:option value="" selected="true" disabled="true">====선택====</form:option>
							<form:option value="public">공공</form:option>
							<form:option value="edu">교육</form:option>
							<form:option value="health">보건</form:option>
							<form:option value="convi">편의</form:option>
							<form:option value="safe">안전</form:option>
							<form:option value="nature">자연</form:option>
						</form:select>
					</td>
				</tr>
				<tr>
					<th>중분류</th>
					<td>
						<form:input path="safetyGubun" cssClass="form-control" type="text"/>
					</td>
				</tr>
				<tr>
					<th>소분류</th>
					<td>
						<form:input path="safetyCode" cssClass="form-control" type="text"/>
					</td>
				</tr>
				<tr>
					<th>제목</th>
					<td>
						<form:input path="safetyNm" cssClass="form-control" type="text"/>
					</td>
				</tr>
				<tr>
					<th>주소</th>
					<td>
						<form:input path="safetyAddr" cssClass="form-control" type="text" id="kakao"/>
					</td>
				</tr>
				<tr>
					<th>위도</th>
					<td>
						<form:input path="safetyLon" cssClass="form-control" type="text" id="lon" placeholder="주소 선택 시 자동 입력됩니다." disabled="true"/>
					</td>
				</tr>
				<tr>
					<th>경도</th>
					<td>
						<form:input path="safetyLat" cssClass="form-control" type="text" id="lat" placeholder="주소 선택 시 자동 입력됩니다." disabled="true"/>
					</td>
				</tr>
				<tr>
					<th>x좌표</th>
					<td>
						<form:input path="safetyX" cssClass="form-control" type="text" id="x" placeholder="주소 선택 시 자동 입력됩니다." disabled="true"/>
					</td>
				</tr>
				<tr>
					<th>y좌표</th>
					<td>
						<form:input path="safetyY" cssClass="form-control" type="text" id="y" placeholder="주소 선택 시 자동 입력됩니다." disabled="true"/>
					</td>
				</tr>
			</tbody>
		</table>
		<button type="submit" class="btn btn-primary" style="position: relative; left: 70%;">등록</button>
		<button type="button" class="btn btn-danger" onclick="window.close()" style="position: relative; left: 70%;">취소</button>
	</form:form>
</div>
<script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
<script src="${context}/resources/js/jquery-3.6.1.min.js"></script>
<script src="${context}/resources/js/ol/proj4js-2.3.14.js"></script>
<script src="${context}/resources/js/ol/ol.js"></script>
<script>
let x = $("#x");
let y = $("#y");
let lon = $("#lon");
let lat = $("#lat");

window.onload = function(){
	document.getElementById("kakao").addEventListener("click", function(){
	    new daum.Postcode({
	        oncomplete: function(data) {
	            let address = data.address;
	            document.getElementById("kakao").value = address;

	            $.ajax({
					url : "http://map.vworld.kr/search.do?apiKey=783D66F2-A36F-3995-B0D6-35F1429C1BFE&category=Juso&pageUnit=10&pageIndex=1&output=json&q=" + address,
					dataType: "jsonp",
					success: function(resp) {
						let inputAddr = resp.LIST[0];
						let lonn = parseFloat(inputAddr.xpos);
						let latt = parseFloat(inputAddr.ypos);
						lon.val(lonn);
						lat.val(latt);
						
						let addr3857 = ol.proj.transform([lonn, latt], 'EPSG:4326', 'EPSG:3857')
						x.val(addr3857[0]);
						y.val(addr3857[1]);
					},
					error : function(jqXHR, status, error) {
						console.log(jqXHR);
						console.log(status);
						console.log(error);
					}
				});

	        }
	    }).open();
	});
}
$("#form").on("submit", function(event) {
	let sort = $("[name=safetySort]").val();
	event.preventDefault();
	
	let action = this.action;
	let method = this.method;
	
	let safety = {
		safetySort : $("[name=safetySort]").val(),
		safetyGubun : $("[name=safetyGubun]").val(),
		safetyCode : $("[name=safetyCode]").val(),
		safetyNm : $("[name=safetyNm]").val(),
		safetyAddr : $("[name=safetyAddr]").val(),
		safetyLon : $("[name=safetyLon]").val(),
		safetyLat : $("[name=safetyLat]").val(),
		safetyX : $("[name=safetyX]").val(),
		safetyY : $("[name=safetyY]").val(),
	}
	
	$.ajax({
		url : action,
		method : method,
		data : JSON.stringify(safety),
		contentType: "application/json; charset=UTF-8",
		success : function(resp) {
			window.opener.addSafetyList(sort);
			let checkBoxs = window.opener.document.querySelectorAll("[name=safety]");
			for (let i in checkBoxs) {
				checkBoxs[i].checked = false;
			}
			window.opener.document.querySelector("#" + sort).checked = true;
			alert("등록 성공");
			window.close();
		},
		error : function(jqXHR, status, error) {
			console.log(jqXHR);
			console.log(status);
			console.log(error);
		}
	});
});

</script>    
</body>
</html>