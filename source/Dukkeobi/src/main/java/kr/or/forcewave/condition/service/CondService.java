package kr.or.forcewave.condition.service;

import java.util.List;

import kr.or.forcewave.condition.vo.CondVO;

public interface CondService {

	public List<CondVO> retrieveCondList();
	public CondVO retrieveCond(int condNo);
	public int createCond(CondVO cond);
	public int modifyCond(CondVO cond);
	public int removeCond(int condNo);
}
