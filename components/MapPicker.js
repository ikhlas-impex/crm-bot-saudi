import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const RIYADH = { lat: 24.7136, lng: 46.6753 };

function loadMaps(lang) {
  if (window.google?.maps) return Promise.resolve();
  if (!window.__mapsLoading) {
    window.__mapsLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&language=${lang}&region=SA`;
      s.onload = resolve;
      s.onerror = () => { window.__mapsLoading = null; reject(new Error('maps')); };
      document.head.appendChild(s);
    });
  }
  return window.__mapsLoading;
}

const comp = (r, type) => r.address_components?.find(c => c.types.includes(type))?.long_name || '';

// Opens a map; the customer taps/drags a pin and onPick gets { address, city, area, link }.
export default function MapPicker({ onPick }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(null);
  const [query, setQuery] = useState('');
  const [notFound, setNotFound] = useState(false);
  const mapEl = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    loadMaps(lang).then(() => {
      if (cancelled) return;
      const { maps } = window.google;
      const map = new maps.Map(mapEl.current, { center: RIYADH, zoom: 11, streetViewControl: false, mapTypeControl: false });
      const marker = new maps.Marker({ map, draggable: true });
      const geocoder = new maps.Geocoder();

      const select = async (latLng) => {
        marker.setPosition(latLng);
        const lat = latLng.lat(), lng = latLng.lng();
        const link = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
        let r = {};
        try { r = (await geocoder.geocode({ location: { lat, lng } })).results[0] || {}; } catch (e) { console.error('Geocoding failed', e); /* keep the pin even if geocoding fails */ }
        setPicked({
          address: r.formatted_address || '',
          city: comp(r, 'locality') || comp(r, 'administrative_area_level_1'),
          area: comp(r, 'sublocality') || comp(r, 'neighborhood'),
          link,
        });
      };

      // shortcut: search uses the Geocoder (addresses/places), not Places autocomplete; upgrade if suggestions-as-you-type are needed
      searchRef.current = async (q) => {
        try {
          const loc = (await geocoder.geocode({ address: q, region: 'SA' })).results[0]?.geometry.location;
          if (!loc) return setNotFound(true);
          setNotFound(false);
          map.setCenter(loc); map.setZoom(16); select(loc);
        } catch (e) { console.error('Search failed', e); setNotFound(true); }
      };

      map.addListener('click', e => select(e.latLng));
      marker.addListener('dragend', e => select(e.latLng));
      navigator.geolocation?.getCurrentPosition(p => {
        const ll = new maps.LatLng(p.coords.latitude, p.coords.longitude);
        map.setCenter(ll); map.setZoom(16); select(ll);
      }, () => {}, { timeout: 8000 });
    }).catch(() => !cancelled && setError(t('complaint.mapError')));

    return () => { cancelled = true; };
  }, [open, lang, t]);

  if (!KEY) return null;

  const confirm = () => { onPick(picked); setOpen(false); };

  return (
    <>
      <button type="button" className="btn btn-secondary" style={{ marginBottom: '0.75rem' }} onClick={() => { setError(''); setPicked(null); setOpen(true); }}>
        📍 {t('complaint.pickOnMap')}
      </button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 640 }}>
            <p style={{ marginBottom: '0.5rem' }}>{t('complaint.mapHint')}</p>
            <form style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}
              onSubmit={e => { e.preventDefault(); if (query.trim()) searchRef.current?.(query.trim()); }}>
              <input className="form-control" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('complaint.mapSearch')} />
              <button type="submit" className="btn btn-secondary">🔍</button>
            </form>
            {notFound && <p>{t('complaint.mapNotFound')}</p>}
            {error ? <p>{error}</p> : <div ref={mapEl} style={{ width: '100%', height: 360, borderRadius: 8 }} />}
            {picked && <p style={{ margin: '0.5rem 0' }}>{picked.address || t('complaint.mapNoAddress')}</p>}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>{t('common.back')}</button>
              <button type="button" className="btn btn-primary" onClick={confirm} disabled={!picked}>{t('complaint.useThisLocation')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
