package kr.or.forcewave.safety.service;

import java.util.List;

import javax.inject.Inject;

import org.springframework.stereotype.Service;

import kr.or.forcewave.safety.dao.SafetyDAO;
import kr.or.forcewave.safety.vo.SafetyVO;

@Service
public class SafetyServiceImpl implements SafetyService {

	@Inject
	private SafetyDAO dao;
	
	@Override
	public List<SafetyVO> retrieveSafetyList(String sort) {
		if (!sort.equals("safetyTotal")) {
			return dao.selectSafetySortList(sort);
		}
		return dao.selectSafetyList();
	}

	@Override
	public SafetyVO retrieveSafety(int gid) {
		return dao.selectSafety(gid);
	}

	@Override
	public int createSafety(SafetyVO safety) {
		return dao.InsertSafety(safety);
	}

	@Override
	public int modifySafety(SafetyVO safety) {
		return dao.UpdateSafety(safety);
	}

	@Override
	public int removeSafety(int gid) {
		return dao.DeleteSafety(gid);
	}

}
