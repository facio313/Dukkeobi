package kr.or.forcewave.safety.controller;

import java.util.List;

import javax.inject.Inject;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import kr.or.forcewave.safety.service.SafetyService;
import kr.or.forcewave.safety.vo.SafetyVO;

@Controller
@RequestMapping("/safety")
public class SafetyController {

	@Inject
	private SafetyService service;
	
	@ModelAttribute("safety")
	public SafetyVO safety() {
		return new SafetyVO();
	}
	
	@ResponseBody
	@GetMapping(produces=MediaType.APPLICATION_JSON_UTF8_VALUE)
	public List<SafetyVO> safetyList(
		@RequestParam("sort") String sort
	) {
		List<SafetyVO> list = service.retrieveSafetyList(sort);
		return list;
	}
	
	@GetMapping("/form")
	public String safetyForm() {
		
		return "safety/form";
	}
	
	@ResponseBody
	@PostMapping()
	public void insert(
		@RequestBody SafetyVO safety
	) {
		service.createSafety(safety);
	}
	
	@ResponseBody
	@DeleteMapping()
	public void delete(
		@RequestParam("gid") int gid
	){
		service.removeSafety(gid);
	}
}
