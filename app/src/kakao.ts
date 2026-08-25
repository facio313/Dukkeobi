export interface LivePlace {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  phone: string;
  url: string;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
}

export interface LivePlaceGroup {
  key: string;
  label: string;
  count: number;
  truncated: boolean;
  partial: boolean;
  failedCodes: string[];
  places: LivePlace[];
}

export interface LivePlaceSnapshot {
  observedAt: string;
  radiusMeters: number;
  partial: boolean;
  failedCodes: string[];
  groups: LivePlaceGroup[];
  places: LivePlace[];
}

const KAKAO_SCRIPT_ID = "dukkeobi-kakao-sdk";
const KAKAO_LOAD_TIMEOUT_MS = 10_000;
const KAKAO_SEARCH_TIMEOUT_MS = 12_000;
const KAKAO_MAX_CATEGORY_PAGES = 3;
let sdkPromise: Promise<any> | null = null;

const categoryGroups = [
  { key: "transit", label: "지하철", codes: ["SW8"] },
  { key: "daily", label: "장보기·편의", codes: ["MT1", "CS2"] },
  { key: "health", label: "병원·약국", codes: ["HP8", "PM9"] },
  { key: "education", label: "학교·학원", codes: ["SC4", "AC5"] },
  { key: "public", label: "공공기관", codes: ["PO3"] },
  { key: "culture", label: "문화·여가", codes: ["CT1", "AT4"] },
] as const;

function validateBrowserKey(key: string): string {
  const trimmed = key.trim();
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(trimmed)) {
    throw new Error("Kakao JavaScript 키가 설정되지 않았습니다.");
  }
  return trimmed;
}

export function loadKakaoPlacesSdk(key: string): Promise<any> {
  if (window.kakao?.maps?.services) return Promise.resolve(window.kakao);
  if (sdkPromise) return sdkPromise;

  const safeKey = validateBrowserKey(key);
  let resolveAttempt!: (sdk: any) => void;
  let rejectAttempt!: (error: Error) => void;
  const attempt = new Promise<any>((resolve, reject) => {
    resolveAttempt = resolve;
    rejectAttempt = reject;
  });
  sdkPromise = attempt;

  let existing = document.getElementById(KAKAO_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing && !window.kakao?.maps?.load) {
    existing.remove();
    existing = null;
  }

  const script = existing ?? document.createElement("script");
  let settled = false;
  let mapsLoadStarted = false;
  let timeout = 0;

  const cleanup = (): void => {
    window.clearTimeout(timeout);
    script.removeEventListener("load", handleScriptLoad);
    script.removeEventListener("error", handleScriptError);
  };
  const fail = (error: Error): void => {
    if (settled) return;
    settled = true;
    cleanup();
    script.remove();
    if (sdkPromise === attempt) sdkPromise = null;
    rejectAttempt(error);
  };
  const succeed = (): void => {
    if (settled) return;
    if (!window.kakao?.maps?.services) {
      fail(new Error("Kakao 장소 라이브러리가 활성화되지 않았습니다."));
      return;
    }
    settled = true;
    cleanup();
    resolveAttempt(window.kakao);
  };
  const startMapsLoad = (): void => {
    if (settled || mapsLoadStarted) return;
    if (!window.kakao?.maps?.load) {
      fail(new Error("Kakao SDK 응답을 확인할 수 없습니다."));
      return;
    }
    mapsLoadStarted = true;
    window.kakao.maps.load(succeed);
  };
  function handleScriptLoad(): void {
    startMapsLoad();
  }
  function handleScriptError(): void {
    fail(new Error("Kakao SDK 요청이 차단되었습니다. 도메인 등록을 확인해 주세요."));
  }

  script.addEventListener("load", handleScriptLoad);
  script.addEventListener("error", handleScriptError);
  timeout = window.setTimeout(
    () => fail(new Error("Kakao 장소 서비스를 불러오는 데 시간이 오래 걸립니다.")),
    KAKAO_LOAD_TIMEOUT_MS,
  );

  if (window.kakao?.maps?.load) {
    startMapsLoad();
  } else {
    script.id = KAKAO_SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey=${encodeURIComponent(safeKey)}`;
    document.head.append(script);
  }

  return attempt;
}

function normalizeKakaoPlaceUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname !== "place.map.kakao.com" || (url.protocol !== "http:" && url.protocol !== "https:")) return "";
    url.protocol = "https:";
    return url.href;
  } catch {
    return "";
  }
}

function normalizePlace(raw: Record<string, string>): LivePlace | null {
  const latitude = Number(raw.y);
  const longitude = Number(raw.x);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const distance = Number(raw.distance);
  return {
    id: raw.id || `${raw.place_name}:${raw.x}:${raw.y}`,
    name: raw.place_name || "이름 없는 장소",
    category: raw.category_group_name || raw.category_name || "주변 장소",
    address: raw.address_name || "",
    roadAddress: raw.road_address_name || "",
    phone: raw.phone || "",
    url: normalizeKakaoPlaceUrl(raw.place_url || ""),
    latitude,
    longitude,
    distanceMeters: Number.isFinite(distance) ? distance : null,
  };
}

async function categorySearch(
  sdk: any,
  code: string,
  latitude: number,
  longitude: number,
  radiusMeters: number,
): Promise<{ places: LivePlace[]; truncated: boolean }> {
  const service = new sdk.maps.services.Places();
  const origin = new sdk.maps.LatLng(latitude, longitude);

  return new Promise((resolve, reject) => {
    const collected: LivePlace[] = [];
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Kakao 장소 검색 시간이 초과되었습니다 (${code})`));
    }, KAKAO_SEARCH_TIMEOUT_MS);
    const succeed = (result: { places: LivePlace[]; truncated: boolean }): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(result);
    };
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(error);
    };
    const callback = (rows: Record<string, string>[], status: string, pagination: any): void => {
      if (settled) return;
      if (status === sdk.maps.services.Status.ZERO_RESULT) {
        succeed({ places: collected, truncated: false });
        return;
      }
      if (status !== sdk.maps.services.Status.OK) {
        fail(new Error(`Kakao 장소 검색 실패 (${code})`));
        return;
      }
      collected.push(...rows.map(normalizePlace).filter((place): place is LivePlace => place !== null));
      if (pagination.hasNextPage && pagination.current < KAKAO_MAX_CATEGORY_PAGES) pagination.nextPage();
      else succeed({ places: collected, truncated: Boolean(pagination.hasNextPage) });
    };

    try {
      service.categorySearch(code, callback, {
        location: origin,
        radius: radiusMeters,
        sort: sdk.maps.services.SortBy.DISTANCE,
        size: 15,
      });
    } catch (error) {
      fail(error instanceof Error ? error : new Error(`Kakao 장소 검색 실패 (${code})`));
    }
  });
}

export async function fetchNearbyPlaces(
  key: string,
  latitude: number,
  longitude: number,
  radiusMeters = 1_000,
): Promise<LivePlaceSnapshot> {
  const sdk = await loadKakaoPlacesSdk(key);
  const groups = await Promise.all(
    categoryGroups.map(async (group) => {
      const settledResults = await Promise.allSettled(
        group.codes.map((code) => categorySearch(sdk, code, latitude, longitude, radiusMeters)),
      );
      const results = settledResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failedCodes = settledResults.flatMap((result, index) => {
        const code = group.codes[index];
        return result.status === "rejected" && code ? [code] : [];
      });
      const deduped = new Map(results.flatMap((result) => result.places).map((place) => [place.id, place]));
      const places = [...deduped.values()].sort(
        (left, right) => (left.distanceMeters ?? Infinity) - (right.distanceMeters ?? Infinity),
      );
      return {
        key: group.key,
        label: group.label,
        count: places.length,
        truncated: results.some((result) => result.truncated),
        partial: failedCodes.length > 0,
        failedCodes,
        places,
      };
    }),
  );
  const failedCodes = groups.flatMap((group) => group.failedCodes);
  const attemptedCodeCount = categoryGroups.reduce((count, group) => count + group.codes.length, 0);
  if (failedCodes.length === attemptedCodeCount) {
    throw new Error("Kakao 주변 장소 검색에 모두 실패했습니다.");
  }
  const places = [...new Map(groups.flatMap((group) => group.places).map((place) => [place.id, place])).values()];
  return {
    observedAt: new Date().toISOString(),
    radiusMeters,
    partial: failedCodes.length > 0,
    failedCodes,
    groups,
    places,
  };
}

export async function searchKakaoPlaces(
  key: string,
  keyword: string,
  center?: { latitude: number; longitude: number },
): Promise<LivePlace[]> {
  const sdk = await loadKakaoPlacesSdk(key);
  const service = new sdk.maps.services.Places();
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Kakao 키워드 검색 시간이 초과되었습니다."));
    }, KAKAO_SEARCH_TIMEOUT_MS);
    const succeed = (places: LivePlace[]): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(places);
    };
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(error);
    };
    const callback = (rows: Record<string, string>[], status: string): void => {
        if (settled) return;
        if (status === sdk.maps.services.Status.ZERO_RESULT) {
          succeed([]);
          return;
        }
        if (status !== sdk.maps.services.Status.OK) {
          fail(new Error("Kakao 키워드 검색에 실패했습니다."));
          return;
        }
        succeed(rows.map(normalizePlace).filter((place): place is LivePlace => place !== null));
      };
    try {
      service.keywordSearch(
        keyword,
        callback,
        center
          ? {
              location: new sdk.maps.LatLng(center.latitude, center.longitude),
              radius: 20_000,
              size: 10,
            }
          : { size: 10 },
      );
    } catch (error) {
      fail(error instanceof Error ? error : new Error("Kakao 키워드 검색에 실패했습니다."));
    }
  });
}
