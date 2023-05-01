package kr.or.forcewave.condition.service;

import java.util.List;

import javax.inject.Inject;

import org.springframework.stereotype.Service;

import kr.or.forcewave.condition.dao.CondDAO;
import kr.or.forcewave.condition.vo.CondVO;

@Service
public class CondServiceImpl implements CondService {

	@Inject
	private CondDAO dao;
	
	@Override
	public List<CondVO> retrieveCondList() {
		return dao.selectCondList();
	}

	@Override
	public CondVO retrieveCond(int condNo) {
		return dao.selectCond(condNo);
	}

	@Override
	public int createCond(CondVO cond) {
		return dao.insertCond(cond);
	}

	@Override
	public int modifyCond(CondVO cond) {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public int removeCond(int condNo) {
		// TODO Auto-generated method stub
		return 0;
	}

}
