import L, { type Circle, type LayerGroup, type Map as LeafletMap, type Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

import type { LivePlace } from "./kakao";

export interface MappableCandidate {
  id: string;
  rank: number;
  name: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  score: number;
}

export interface MapSearchResult {
  latitude: number;
  longitude: number;
  name: string;
  category: string;
}

function escapeMarkup(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

export class DukkeobiMap {
  private readonly map: LeafletMap;
  private readonly candidateLayer: LayerGroup;
  private readonly liveLayer: LayerGroup;
  private readonly searchLayer: LayerGroup;
  private readonly markers = new Map<string, Marker>();
  private readonly onCandidateSelect: (id: string, focusInspector?: boolean) => void;
  private locationMarker: Marker | null = null;
  private locationAccuracy: Circle | null = null;

  constructor(container: HTMLElement, onCandidateSelect: (id: string, focusInspector?: boolean) => void) {
    this.onCandidateSelect = onCandidateSelect;
    this.map = L.map(container, {
      center: [37.558, 126.925],
      zoom: 13,
      zoomControl: false,
      preferCanvas: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(this.map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(this.map);
    this.candidateLayer = L.layerGroup().addTo(this.map);
    this.liveLayer = L.layerGroup().addTo(this.map);
    this.searchLayer = L.layerGroup().addTo(this.map);
    this.map.getContainer().setAttribute("aria-label", "마포구 주거 후보 지도");
    this.map.getContainer().setAttribute("role", "application");

  }

  setCandidates(candidates: MappableCandidate[]): void {
    this.candidateLayer.clearLayers();
    this.markers.clear();
    candidates.forEach((candidate) => {
      const roundedScore = Math.round(candidate.score);
      const markerOptions: L.MarkerOptions & { candidateId: string } = {
        candidateId: candidate.id,
        keyboard: true,
        title: `${candidate.name}, 적합도 ${roundedScore}`,
        icon: L.divIcon({
          className: "candidate-marker-shell",
          html: `<span class="candidate-marker" data-rank="${candidate.rank}"><b>${roundedScore}</b></span>`,
          iconSize: [52, 58],
          iconAnchor: [26, 52],
          tooltipAnchor: [0, -42],
        }),
      };
      const marker = L.marker([candidate.latitude, candidate.longitude], markerOptions);
      marker.on("click", () => this.onCandidateSelect(candidate.id, false));
      marker.bindTooltip(
        `<strong>${escapeMarkup(candidate.name)}</strong><br>${escapeMarkup(candidate.district)} · 적합도 ${roundedScore}`,
        {
          direction: "top",
          offset: [0, -8],
        },
      );
      marker.addTo(this.candidateLayer);
      marker.getElement()?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        this.onCandidateSelect(candidate.id, true);
      });
      this.markers.set(candidate.id, marker);
    });
  }

  fitCandidates(candidates: MappableCandidate[]): void {
    if (candidates.length === 0) return;
    if (candidates.length === 1) {
      const candidate = candidates[0];
      if (candidate) this.map.flyTo([candidate.latitude, candidate.longitude], 15, { duration: 0.55 });
      return;
    }
    this.map.fitBounds(
      L.latLngBounds(candidates.map((candidate) => [candidate.latitude, candidate.longitude])),
      { padding: [54, 54], maxZoom: 15, animate: true, duration: 0.55 },
    );
  }

  selectCandidate(candidate: MappableCandidate, move = true): void {
    this.markers.forEach((marker, id) => {
      const element = marker.getElement()?.querySelector<HTMLElement>(".candidate-marker");
      element?.classList.toggle("is-selected", id === candidate.id);
    });
    const marker = this.markers.get(candidate.id);
    marker?.openTooltip();
    if (move) this.map.flyTo([candidate.latitude, candidate.longitude], Math.max(this.map.getZoom(), 15), {
      duration: 0.55,
    });
  }

  showLivePlaces(places: LivePlace[]): void {
    this.liveLayer.clearLayers();
    places.slice(0, 80).forEach((place) => {
      const icon = L.divIcon({
        className: "live-place-marker-shell",
        html: '<span class="live-place-marker" aria-hidden="true"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([place.latitude, place.longitude], {
        icon,
        keyboard: true,
        title: `${place.name} · ${place.category}`,
      })
        .bindTooltip(`<strong>${escapeMarkup(place.name)}</strong><br>${escapeMarkup(place.category)}`)
        .addTo(this.liveLayer);
    });
  }

  showSearchResults(results: MapSearchResult[]): void {
    this.searchLayer.clearLayers();
    results.forEach((result, index) => {
      L.marker([result.latitude, result.longitude], {
        keyboard: true,
        title: `${result.name} · ${result.category}`,
        icon: L.divIcon({
          className: "search-marker-shell",
          html: `<span class="search-marker"><b>${index + 1}</b></span>`,
          iconSize: [32, 38],
          iconAnchor: [16, 34],
        }),
      })
        .bindTooltip(`<strong>${escapeMarkup(result.name)}</strong><br>${escapeMarkup(result.category)}`)
        .addTo(this.searchLayer);
    });
    if (results.length > 0) {
      this.map.fitBounds(
        L.latLngBounds(results.map((result) => [result.latitude, result.longitude])),
        { padding: [60, 60], maxZoom: 16 },
      );
    }
  }

  getCenter(): { latitude: number; longitude: number } {
    const center = this.map.getCenter();
    return { latitude: center.lat, longitude: center.lng };
  }

  locate(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      const onFound = (event: any): void => {
        cleanup();
        const { lat, lng } = event.latlng as { lat: number; lng: number };
        this.locationMarker?.remove();
        this.locationAccuracy?.remove();
        this.locationAccuracy = L.circle([lat, lng], {
          radius: event.accuracy,
          color: "#315fd4",
          weight: 1,
          fillColor: "#315fd4",
          fillOpacity: 0.08,
        }).addTo(this.map);
        this.locationMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "location-marker-shell",
            html: '<span class="location-marker" aria-label="현재 위치"></span>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
          title: "현재 위치",
        }).addTo(this.map);
        this.map.flyTo([lat, lng], 15, { duration: 0.55 });
        resolve({ latitude: lat, longitude: lng });
      };
      const onError = (event: any): void => {
        cleanup();
        reject(new Error(event.message || "현재 위치를 확인할 수 없습니다."));
      };
      const cleanup = (): void => {
        this.map.off("locationfound", onFound);
        this.map.off("locationerror", onError);
      };
      this.map.on("locationfound", onFound);
      this.map.on("locationerror", onError);
      this.map.locate({ enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 });
    });
  }

  invalidateSize(): void {
    window.setTimeout(() => this.map.invalidateSize({ animate: false }), 240);
  }
}
