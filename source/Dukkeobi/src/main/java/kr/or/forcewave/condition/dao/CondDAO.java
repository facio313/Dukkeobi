package kr.or.forcewave.condition.dao;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import kr.or.forcewave.condition.vo.CondVO;

@Mapper
public interface CondDAO {
	public List<CondVO> selectCondList();
	public CondVO selectCond(int condNo);
	public int insertCond(CondVO cond);
	public int updateCond(CondVO cond);
	public int deleteCond(int condNo);
}
