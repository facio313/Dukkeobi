package kr.or.forcewave.index.controller;

import java.util.Map;

import javax.inject.Inject;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import kr.or.forcewave.condition.vo.CondVO;
import kr.or.forcewave.index.service.IndexService;

@Controller
public class IndexController{
	
	@Inject
	private IndexService service;
	
	@ModelAttribute
	public CondVO cond() {
		return new CondVO();
	}
	
	@RequestMapping("/index.do")
	public String index(
		Model model
		, @ModelAttribute("cond") CondVO cond
	){
		
		return "index";
	}
	
	@ResponseBody
	@GetMapping(value="/getXY", produces=MediaType.APPLICATION_JSON_UTF8_VALUE)
	public Map<String, String> getXY(
		@RequestParam("admNm") String admNm
	) {
		return service.retrieveXY(admNm);
	}
	
}
