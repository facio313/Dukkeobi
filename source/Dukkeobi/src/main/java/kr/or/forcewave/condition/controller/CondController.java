package kr.or.forcewave.condition.controller;

import java.util.List;

import javax.inject.Inject;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import kr.or.forcewave.condition.service.CondService;
import kr.or.forcewave.condition.vo.CondVO;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
@RequestMapping("/cond")
public class CondController {

	@Inject
	private CondService service;
	
	@ModelAttribute
	public CondVO cond() {
		return new CondVO();
	}
	
	@ResponseBody
	@GetMapping(produces=MediaType.APPLICATION_JSON_UTF8_VALUE)
	public List<CondVO> getCondList() {
		return service.retrieveCondList();
	}
	
	@ResponseBody
	@GetMapping(value="/getCond", produces=MediaType.APPLICATION_JSON_UTF8_VALUE)
	public CondVO getCond(
		@RequestParam("condNo") int condNo
	) {
		System.out.println(condNo);
		return service.retrieveCond(condNo);
	}
	
	@ResponseBody
	@PostMapping
	public void saveCont(
		@ModelAttribute("cond") CondVO cond
	) {
		service.createCond(cond);
	}
}
