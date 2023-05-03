package kr.or.forcewave.spatial.dao;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import kr.or.forcewave.condition.vo.CondVO;
import kr.or.forcewave.safety.vo.SafetyVO;
import kr.or.forcewave.spatial.vo.ResultVO;

@Mapper
public interface SpatialDAO {

	public List<SafetyVO> selectSafetyList(String clicked);
	
	
	/**
	 * @param condNo
	 * @return 분석결과
	 */
	public ResultVO selectResult(int resultNo);
	
	/**
	 * @param condNo
	 * @return 실거래가 조건에 맞는 폴리곤
	 */
	public ResultVO selectRe(CondVO cond);
	
	public List<ResultVO> selectAnalysis(CondVO cond);
	
	public int insertResult(ResultVO result);
}
