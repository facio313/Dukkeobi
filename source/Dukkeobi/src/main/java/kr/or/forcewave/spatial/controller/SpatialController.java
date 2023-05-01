package kr.or.forcewave.spatial.controller;

import java.util.List;

import javax.inject.Inject;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import kr.or.forcewave.safety.vo.SafetyVO;
import kr.or.forcewave.spatial.service.SpatialService;
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
}