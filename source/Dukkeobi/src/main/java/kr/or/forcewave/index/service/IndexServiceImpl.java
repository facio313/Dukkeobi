package kr.or.forcewave.index.service;

import java.util.Map;

import javax.inject.Inject;

import org.springframework.stereotype.Service;

import kr.or.forcewave.index.dao.IndexDAO;

@Service
public class IndexServiceImpl implements IndexService {

	@Inject
	private IndexDAO dao;
	
	@Override
	public Map<String, String> retrieveXY(String admNm) {
		
		return dao.selectXY(admNm);
	}

}
