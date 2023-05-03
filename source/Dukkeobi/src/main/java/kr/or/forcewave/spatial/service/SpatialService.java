package kr.or.forcewave.spatial.service;

import java.util.List;

import kr.or.forcewave.safety.vo.SafetyVO;
import kr.or.forcewave.spatial.vo.ResultVO;

public interface SpatialService {
	
	public List<ResultVO> retrieveResult(int resultNo);
	public List<SafetyVO> retrieveSafetyList(String clicked);
	public List<ResultVO> getResult(int condNo);
}
