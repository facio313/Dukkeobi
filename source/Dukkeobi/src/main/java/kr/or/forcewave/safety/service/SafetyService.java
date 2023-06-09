package kr.or.forcewave.safety.service;

import java.util.List;

import kr.or.forcewave.safety.vo.SafetyVO;

public interface SafetyService {

	public List<SafetyVO> retrieveSafetyList(String sort);
	public SafetyVO retrieveSafety(int gid);
	public int createSafety(SafetyVO safety);
	public int modifySafety(SafetyVO safety);
	public int removeSafety(int gid);
	
}
