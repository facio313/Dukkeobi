package kr.or.forcewave.config;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Keeps the public portfolio deployment read-only and prevents legacy data
 * endpoints from pretending to work when the PostGIS/GeoServer dataset is not
 * installed. Both protections default to the safe setting.
 */
public class PortfolioGuardFilter implements Filter {

	private static final Set<String> SAFE_METHODS = new HashSet<String>(
		Arrays.asList("GET", "HEAD", "OPTIONS")
	);

	private boolean readOnly;
	private boolean dataAvailable;

	@Override
	public void init(FilterConfig filterConfig) {
		readOnly = environmentFlag("DUKKEOBI_READ_ONLY", true);
		dataAvailable = environmentFlag("DUKKEOBI_DATA_AVAILABLE", false);
	}

	@Override
	public void doFilter(
		ServletRequest servletRequest,
		ServletResponse servletResponse,
		FilterChain chain
	) throws IOException, ServletException {
		HttpServletRequest request = (HttpServletRequest) servletRequest;
		HttpServletResponse response = (HttpServletResponse) servletResponse;

		if (readOnly && !SAFE_METHODS.contains(request.getMethod())) {
			writeError(response, HttpServletResponse.SC_FORBIDDEN,
				"This archived portfolio deployment is read-only.");
			return;
		}

		if (!dataAvailable && isDataEndpoint(relativePath(request))) {
			writeError(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE,
				"The original PostGIS and GeoServer dataset is not available.");
			return;
		}

		chain.doFilter(servletRequest, servletResponse);
	}

	private String relativePath(HttpServletRequest request) {
		String uri = request.getRequestURI();
		String contextPath = request.getContextPath();
		return uri.substring(contextPath.length());
	}

	private boolean isDataEndpoint(String path) {
		return path.equals("/getXY")
			|| path.equals("/safety") || path.startsWith("/safety/")
			|| path.equals("/cond") || path.startsWith("/cond/")
			|| path.equals("/spatial") || path.startsWith("/spatial/")
			|| path.equals("/geoserver") || path.startsWith("/geoserver/");
	}

	private void writeError(HttpServletResponse response, int status, String message)
		throws IOException {
		response.setStatus(status);
		response.setCharacterEncoding("UTF-8");
		response.setContentType("text/plain;charset=UTF-8");
		response.getWriter().write(message);
	}

	private boolean environmentFlag(String name, boolean defaultValue) {
		String value = System.getenv(name);
		return value == null ? defaultValue : Boolean.parseBoolean(value);
	}

	@Override
	public void destroy() {
		// Nothing to release.
	}
}
