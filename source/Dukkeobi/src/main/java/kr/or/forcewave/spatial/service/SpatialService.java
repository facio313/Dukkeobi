package kr.or.forcewave.spatial.service;

import java.util.List;
import java.util.Map;

import kr.or.forcewave.safety.vo.SafetyVO;
import kr.or.forcewave.spatial.vo.ResultVO;

public interface SpatialService {
	
	public List<ResultVO> retrieveResult(int resultNo);
	public List<SafetyVO> retrieveSafetyList(String clicked);
	public List<ResultVO> getResult(int condNo);
	
	public List<ResultVO> retireveHeart();
	public int modifyHeart(int resultNo);
	public int deleteHeart(int resultNo);
	
	public List<Map<String, String>> selectReList();
}
