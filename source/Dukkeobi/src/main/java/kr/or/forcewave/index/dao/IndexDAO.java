package kr.or.forcewave.index.dao;

import java.util.Map;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface IndexDAO {
	public Map<String, String> selectXY(String admNm);
}
