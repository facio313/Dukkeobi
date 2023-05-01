package kr.or.forcewave.spatial.dao;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import kr.or.forcewave.safety.vo.SafetyVO;

@Mapper
public interface SpatialDAO {

	public List<SafetyVO> selectSafetyList(String clicked);
}
