package kr.or.forcewave.safety.dao;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import kr.or.forcewave.safety.vo.SafetyVO;

@Mapper
public interface SafetyDAO {
	
	public List<SafetyVO> selectSafetyList();
	public List<SafetyVO> selectSafetySortList(String sort);
	public SafetyVO selectSafety(int gid);
	public int InsertSafety(SafetyVO safety);
	public int UpdateSafety(SafetyVO safety);
	public int DeleteSafety(int gid);
}
