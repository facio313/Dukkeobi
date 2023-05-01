package kr.or.forcewave.spatial.service;

import java.util.List;

import javax.inject.Inject;

import org.springframework.stereotype.Service;

import kr.or.forcewave.safety.vo.SafetyVO;
import kr.or.forcewave.spatial.dao.SpatialDAO;

@Service
public class SpatialServiceImpl implements SpatialService {

	@Inject
	private SpatialDAO dao;
	
	@Override
	public List<SafetyVO> retrieveSafetyList(String clicked) {
		return dao.selectSafetyList(clicked);
	}

}