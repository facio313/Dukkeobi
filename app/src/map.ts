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

export type CandidatePreviewHandler = (id: string | null) => void;

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
  private readonly analysisLayer: LayerGroup;
  private readonly candidateLayer: LayerGroup;
  private readonly liveLayer: LayerGroup;
  private readonly searchLayer: LayerGroup;
  private readonly markers = new Map<string, Marker>();
  private readonly candidates = new Map<string, MappableCandidate>();
  private readonly markerRenderKeys = new Map<string, string>();
  private readonly boundMarkerElements = new WeakSet<HTMLElement>();
  private readonly onCandidateSelect: (id: string, focusInspector?: boolean) => void;
  private readonly onCandidatePreview: CandidatePreviewHandler;
  private selectedId: string | null = null;
  private previewedId: string | null = null;
  private analysisHaloKey: string | null = null;
  private locationMarker: Marker | null = null;
  private locationAccuracy: Circle | null = null;

  constructor(
    container: HTMLElement,
    onCandidateSelect: (id: string, focusInspector?: boolean) => void,
    onCandidatePreview: CandidatePreviewHandler = () => undefined,
  ) {
    this.onCandidateSelect = onCandidateSelect;
    this.onCandidatePreview = onCandidatePreview;
    this.map = L.map(container, {
      center: [37.558, 126.925],
      zoom: 13,
      zoomControl: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(this.map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(this.map);
    this.analysisLayer = L.layerGroup().addTo(this.map);
    this.candidateLayer = L.layerGroup().addTo(this.map);
    this.liveLayer = L.layerGroup().addTo(this.map);
    this.searchLayer = L.layerGroup().addTo(this.map);
    this.map.getContainer().setAttribute("aria-label", "마포구 주거 후보 지도");
    this.map.getContainer().setAttribute("role", "application");
  }

  setCandidates(candidates: MappableCandidate[]): void {
    const nextCandidates = new Map(candidates.map((candidate) => [candidate.id, candidate]));

    this.markers.forEach((marker, id) => {
      if (nextCandidates.has(id)) return;
      marker.off();
      this.candidateLayer.removeLayer(marker);
      this.markers.delete(id);
      this.candidates.delete(id);
      this.markerRenderKeys.delete(id);
    });
    this.candidates.forEach((_candidate, id) => {
      if (!nextCandidates.has(id)) this.candidates.delete(id);
    });

    const removedPreview = this.previewedId !== null && !nextCandidates.has(this.previewedId);
    if (this.selectedId !== null && !nextCandidates.has(this.selectedId)) this.selectedId = null;
    if (removedPreview) this.previewedId = null;

    candidates.forEach((candidate) => {
      this.candidates.set(candidate.id, candidate);
      const existing = this.markers.get(candidate.id);
      if (existing) this.updateCandidateMarker(existing, candidate);
      else this.createCandidateMarker(candidate);
    });

    this.markers.forEach((_marker, id) => this.applyMarkerInteractionState(id));
    this.renderAnalysisHalo();
    if (removedPreview) this.onCandidatePreview(null);
  }

  fitCandidates(candidates: MappableCandidate[]): void {
    if (candidates.length === 0) return;
    if (candidates.length === 1) {
      const candidate = candidates[0];
      if (candidate) this.moveTo([candidate.latitude, candidate.longitude], 15);
      return;
    }
    const reducedMotion = this.prefersReducedMotion();
    this.map.fitBounds(
      L.latLngBounds(candidates.map((candidate) => [candidate.latitude, candidate.longitude])),
      { padding: [54, 54], maxZoom: 15, animate: !reducedMotion, duration: reducedMotion ? 0 : 0.55 },
    );
  }

  selectCandidate(candidate: MappableCandidate | null, move = true): void {
    const previousId = this.selectedId;
    this.selectedId = candidate?.id ?? null;
    if (candidate) this.candidates.set(candidate.id, candidate);

    if (previousId) this.applyMarkerInteractionState(previousId);
    if (this.selectedId) this.applyMarkerInteractionState(this.selectedId);
    this.renderAnalysisHalo();

    if (candidate && move) {
      this.moveTo([candidate.latitude, candidate.longitude], Math.max(this.map.getZoom(), 15));
    }
  }

  /** Visually links a candidate card to its map marker without changing selection. */
  previewCandidate(id: string | null): void {
    this.setPreviewedCandidate(id, false);
  }

  clearSelection(): void {
    this.selectCandidate(null, false);
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
      const reducedMotion = this.prefersReducedMotion();
      this.map.fitBounds(
        L.latLngBounds(results.map((result) => [result.latitude, result.longitude])),
        { padding: [60, 60], maxZoom: 16, animate: !reducedMotion, duration: reducedMotion ? 0 : 0.55 },
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
        this.moveTo([lat, lng], 15);
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

  private createCandidateMarker(candidate: MappableCandidate): void {
    const marker = L.marker([candidate.latitude, candidate.longitude], {
      keyboard: true,
      title: this.markerTitle(candidate),
      icon: this.candidateIcon(candidate),
    });
    marker.on("click", () => this.onCandidateSelect(candidate.id, false));
    marker.on("mouseover", () => this.setPreviewedCandidate(candidate.id, true));
    marker.on("mouseout", () => {
      const element = marker.getElement();
      if (element === document.activeElement) return;
      this.setPreviewedCandidate(null, true);
    });
    marker.addTo(this.candidateLayer);
    this.markers.set(candidate.id, marker);
    this.markerRenderKeys.set(candidate.id, this.markerRenderKey(candidate));
    this.bindMarkerElement(marker, candidate.id);
  }

  private updateCandidateMarker(marker: Marker, candidate: MappableCandidate): void {
    const nextPosition = L.latLng(candidate.latitude, candidate.longitude);
    if (!marker.getLatLng().equals(nextPosition)) marker.setLatLng(nextPosition);

    const nextRenderKey = this.markerRenderKey(candidate);
    if (this.markerRenderKeys.get(candidate.id) !== nextRenderKey) {
      marker.setIcon(this.candidateIcon(candidate));
      this.markerRenderKeys.set(candidate.id, nextRenderKey);
    }

    marker.options.title = this.markerTitle(candidate);
    this.bindMarkerElement(marker, candidate.id);
  }

  private candidateIcon(candidate: MappableCandidate): L.DivIcon {
    const roundedScore = Math.round(candidate.score);
    const name = escapeMarkup(candidate.name);
    return L.divIcon({
      className: "candidate-marker-shell",
      html: `<span class="candidate-marker" data-candidate-id="${escapeMarkup(candidate.id)}" data-rank="${candidate.rank}" data-score="${roundedScore}" data-name="${name}" data-state="idle"><b class="candidate-marker-score">${roundedScore}</b><span class="candidate-marker-label visually-hidden" aria-hidden="true"><strong>${name}</strong><small>적합도 ${roundedScore}</small></span></span>`,
      iconSize: [52, 58],
      iconAnchor: [26, 52],
    });
  }

  private markerRenderKey(candidate: MappableCandidate): string {
    return [
      candidate.id,
      candidate.name,
      candidate.rank,
      Math.round(candidate.score),
    ].join("\u0000");
  }

  private markerTitle(candidate: MappableCandidate): string {
    return `${candidate.name}, 적합도 ${Math.round(candidate.score)}`;
  }

  private bindMarkerElement(marker: Marker, candidateId: string): void {
    const element = marker.getElement();
    const candidate = this.candidates.get(candidateId);
    if (!element || !candidate) return;

    element.dataset.candidateId = candidateId;
    element.dataset.score = String(Math.round(candidate.score));
    element.setAttribute("aria-label", this.markerTitle(candidate));
    element.title = this.markerTitle(candidate);

    if (!this.boundMarkerElements.has(element)) {
      this.boundMarkerElements.add(element);
      element.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        this.onCandidateSelect(candidateId, true);
      });
      element.addEventListener("focus", () => this.setPreviewedCandidate(candidateId, true));
      element.addEventListener("blur", () => {
        window.requestAnimationFrame(() => {
          if (marker.getElement()?.matches(":hover")) return;
          this.setPreviewedCandidate(null, true);
        });
      });
    }

    this.applyMarkerInteractionState(candidateId);
  }

  private setPreviewedCandidate(id: string | null, notify: boolean): void {
    const nextId = id !== null && this.markers.has(id) ? id : null;
    if (nextId === this.previewedId) return;

    const previousId = this.previewedId;
    this.previewedId = nextId;
    if (previousId) this.applyMarkerInteractionState(previousId);
    if (nextId) this.applyMarkerInteractionState(nextId);
    if (notify) this.onCandidatePreview(nextId);
  }

  private applyMarkerInteractionState(id: string): void {
    const marker = this.markers.get(id);
    if (!marker) return;
    const selected = id === this.selectedId;
    const previewed = id === this.previewedId;
    const state = selected ? "selected" : previewed ? "preview" : "idle";
    const shell = marker.getElement();
    const markerElement = shell?.querySelector<HTMLElement>(".candidate-marker");

    shell?.classList.toggle("is-selected", selected);
    shell?.classList.toggle("is-previewed", previewed);
    if (selected) shell?.setAttribute("aria-current", "true");
    else shell?.removeAttribute("aria-current");
    if (shell) shell.dataset.state = state;

    markerElement?.classList.toggle("is-selected", selected);
    markerElement?.classList.toggle("is-previewed", previewed);
    if (markerElement) {
      markerElement.dataset.state = state;
      markerElement.dataset.selected = String(selected);
      markerElement.dataset.previewed = String(previewed);
    }
    marker.setZIndexOffset(selected ? 1_000 : previewed ? 500 : 0);
  }

  private renderAnalysisHalo(): void {
    const candidate = this.selectedId ? this.candidates.get(this.selectedId) : undefined;
    const nextKey = candidate ? `${candidate.id}:${candidate.latitude}:${candidate.longitude}` : null;
    if (nextKey === this.analysisHaloKey) return;

    this.analysisLayer.clearLayers();
    this.analysisHaloKey = nextKey;
    if (!candidate) return;

    const center = L.latLng(candidate.latitude, candidate.longitude);
    L.circle(center, {
      radius: 1_000,
      className: "analysis-halo analysis-halo--one-kilometer",
      color: "#19734b",
      weight: 2,
      opacity: 0.78,
      fillColor: "#19734b",
      fillOpacity: 0.07,
      interactive: false,
    }).addTo(this.analysisLayer);
    L.circle(center, {
      radius: 700,
      className: "analysis-halo analysis-halo--transit",
      color: "#5268e8",
      weight: 1.5,
      opacity: 0.76,
      fillColor: "#5268e8",
      fillOpacity: 0.025,
      dashArray: "6 7",
      interactive: false,
    }).addTo(this.analysisLayer);
  }

  private prefersReducedMotion(): boolean {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private moveTo(center: L.LatLngExpression, zoom: number): void {
    if (this.prefersReducedMotion()) {
      this.map.setView(center, zoom, { animate: false });
      return;
    }
    this.map.flyTo(center, zoom, { duration: 0.55 });
  }
}
