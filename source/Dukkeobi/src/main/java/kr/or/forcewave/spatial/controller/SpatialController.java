package kr.or.forcewave.spatial.controller;

import java.util.List;
import java.util.Map;

import javax.inject.Inject;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import kr.or.forcewave.safety.vo.SafetyVO;
import kr.or.forcewave.spatial.service.SpatialService;
import kr.or.forcewave.spatial.vo.ResultVO;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
@RequestMapping("/spatial")
public class SpatialController {

	@Inject
	private SpatialService service;

	@ResponseBody
	@GetMapping(value="/safetyList", produces=MediaType.APPLICATION_JSON_UTF8_VALUE)
	public List<SafetyVO> getSafetyList(
		@RequestParam("clicked") String clicked
	) {
		log.info("{}", clicked);
		return service.retrieveSafetyList(clicked);
	}
	
	@ResponseBody
	@PostMapping(value="/analyze", produces=MediaType.APPLICATION_JSON_UTF8_VALUE)
	public List<ResultVO> getAnalysis(
		@RequestParam("condNo") int condNo
	) {
		return service.getResult(condNo);
	}
	
	@ResponseBody
	@GetMapping(value="/result", produces=MediaType.APPLICATION_JSON_UTF8_VALUE)
	public List<ResultVO> getResult(
		@RequestParam("resultNo") int resultNo
	) {
		return service.retrieveResult(resultNo);
	}
	
	@ResponseBody
	@GetMapping(value="/heart", produces=MediaType.APPLICATION_JSON_UTF8_VALUE)
	public List<ResultVO> getHeartList() {
		return service.retireveHeart();
	}
	
	@ResponseBody
	@PostMapping("/updateHeart")
	public void updateHeart(
		@RequestParam("resultNo") int resultNo
	) {
		service.modifyHeart(resultNo);
	}
	
	@ResponseBody
	@PostMapping("/deleteHeart")
	public void deleteHeart(
		@RequestParam("resultNo") int resultNo
	) {
		service.deleteHeart(resultNo);
	}
	
	@ResponseBody
	@GetMapping(value="/reList", produces=MediaType.APPLICATION_JSON_UTF8_VALUE)
	public List<Map<String, String>> getReList() {
		return service.selectReList();
	}
}
