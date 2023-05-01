package kr.or.forcewave.spatial.service;

import java.util.List;

import kr.or.forcewave.safety.vo.SafetyVO;

public interface SpatialService {
	
	public List<SafetyVO> retrieveSafetyList(String clicked);
}
