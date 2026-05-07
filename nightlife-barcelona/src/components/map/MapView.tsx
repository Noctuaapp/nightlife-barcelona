"use client";

import Map, { Marker } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function MapView() {
  return (
    <div style={{ height: 400, marginTop: 20, borderRadius: 12, overflow: "hidden" }}>
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          latitude: 41.3851,
          longitude: 2.1734,
          zoom: 12,
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        <Marker latitude={41.3851} longitude={2.1734}>
          📍
        </Marker>
      </Map>
    </div>
  );
}