import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { searchEbaySoldListings } from '../lib/ebay';
import { analyzeShirtPhoto } from '../lib/claude';

// Resize to max 800px on the longest edge and convert to WebP before upload.
// Falls back to the original file on any canvas/codec failure.
async function compressImage(file) {
  const MAX_PX = 800;
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(1, MAX_PX / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
        },
        'image/webp',
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

const STYLES = [
  { value: 'band_tee',  label: 'Band Tee' },
  { value: 'sports',    label: 'Sports' },
  { value: 'workwear',  label: 'Workwear' },
  { value: 'souvenir',  label: 'Souvenir' },
  { value: 'other',     label: 'Other' },
];
const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
const PHOTO_SLOTS = [
  { key: 'front', label: 'Front' },
  { key: 'back',  label: 'Back' },
  { key: 'tags',  label: 'Tags' },
];

const EMPTY_FORM = {
  brand: '', era: '', year: '', style: 'band_tee', size: '',
  condition: 'Excellent', purchase_price: '', purchase_date: '',
  current_value: '', valuation_notes: '', notes: '',
  tour_or_event: '', graphic_keywords: '', sport: '', location: '',
};

const EMPTY_SLOTS = {
  front: { url: null, pendingFile: null, removed: false },
  back:  { url: null, pendingFile: null, removed: false },
  tags:  { url: null, pendingFile: null, removed: false },
};

const inputCls = 'w-full bg-gray-800 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all';

function SectionHeading({ children }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function PhotoSlot({ slotKey, label, currentUrl, pendingFile, onFileSelect, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!pendingFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const displayUrl = previewUrl ?? currentUrl;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center">{label}</p>
      <div className="aspect-square rounded-2xl overflow-hidden bg-gray-800/50 border-2 border-dashed border-gray-700/60 relative group hover:border-gray-600 transition-colors">
        {displayUrl ? (
          <>
            <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
            {pendingFile && (
              <span className="absolute bottom-2 left-2 bg-amber-500 text-gray-950 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                NEW
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(slotKey)}
              className="absolute top-2 right-2 w-7 h-7 bg-gray-950/70 hover:bg-gray-950/90 text-gray-300 hover:text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
              aria-label={`Remove ${label} photo`}
            >
              ✕
            </button>
          </>
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer text-gray-700 hover:text-gray-400 transition-colors group/label">
            <svg className="w-7 h-7 group-hover/label:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Add photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    alert('Max 10 MB per photo.');
                    e.target.value = '';
                    return;
                  }
                  onFileSelect(slotKey, file);
                }
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export default function AddEditShirt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && id !== 'new';
  const { user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [slots, setSlots] = useState(EMPTY_SLOTS);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState(null);

  const [ebayListings, setEbayListings] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [ebaySearching, setEbaySearching] = useState(false);
  const [ebayQuery, setEbayQuery] = useState('');
  const [ebayOffset, setEbayOffset] = useState(0);
  const [ebayNoMore, setEbayNoMore] = useState(false);
  const [ebayError, setEbayError] = useState(null);

  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiFields, setAiFields] = useState([]);

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('shirts').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) return;
      setForm({
        brand: data.brand ?? '',
        era: data.era ?? '',
        year: data.year ?? '',
        style: data.style ?? 'band_tee',
        size: data.size ?? '',
        condition: data.condition ?? 'Excellent',
        purchase_price: data.purchase_price ?? '',
        purchase_date: data.purchase_date ?? '',
        current_value: data.current_value ?? '',
        valuation_notes: data.valuation_notes ?? '',
        notes: data.notes ?? '',
        tour_or_event: data.tour_or_event ?? '',
        graphic_keywords: data.graphic_keywords ?? '',
        sport: data.sport ?? '',
        location: data.location ?? '',
      });
      const photoMap = {};
      (data.photos ?? []).forEach((p) => { photoMap[p.slot] = p.url; });
      setSlots({
        front: { url: photoMap.front ?? null, pendingFile: null, removed: false },
        back:  { url: photoMap.back  ?? null, pendingFile: null, removed: false },
        tags:  { url: photoMap.tags  ?? null, pendingFile: null, removed: false },
      });
    });
  }, [id, isEdit]);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function searchEbay(params) {
    // params lets callers pass fresh values before form state re-renders (e.g. after AI fill)
    const { brand, style, era, year, tour_or_event, graphic_keywords, sport, location } = params ?? form;
    setEbaySearching(true);
    setEbayError(null);
    setEbayListings([]);
    setCheckedIds(new Set());
    setEbayQuery('');
    setEbayOffset(0);
    setEbayNoMore(false);
    try {
      const { listings, query } = await searchEbaySoldListings({ brand, style, era, year, tour_or_event, graphic_keywords, sport, location });
      setEbayListings(listings);
      setEbayQuery(query);
      setEbayOffset(listings.length);
      setCheckedIds(new Set(listings.map((_, i) => i)));
    } catch (err) {
      setEbayError('eBay search failed — check your API credentials.');
    } finally {
      setEbaySearching(false);
    }
  }

  async function loadMore() {
    if (!ebayQuery) return;
    setEbaySearching(true);
    try {
      const { listings } = await searchEbaySoldListings({ query: ebayQuery, offset: ebayOffset });
      if (!listings?.length) { setEbayNoMore(true); return; }
      const startIdx = ebayListings.length;
      setEbayListings((prev) => [...prev, ...listings]);
      setEbayOffset((prev) => prev + listings.length);
      setCheckedIds((prev) => {
        const next = new Set(prev);
        listings.forEach((_, i) => next.add(startIdx + i));
        return next;
      });
    } catch {
      setEbayError('Could not load more results.');
    } finally {
      setEbaySearching(false);
    }
  }

  function toggleCheck(idx) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  async function analyzePhoto() {
    const file = slots.front.pendingFile;
    if (!file) return;
    setAiAnalyzing(true);
    setAiError(null);
    setAiFields([]);
    try {
      const result = await analyzeShirtPhoto(file);

      const validStyles = STYLES.map((s) => s.value);
      const updates = {};
      const filled = [];

      if (result.brand)         { updates.brand           = result.brand;                             filled.push('brand'); }
      if (result.era)           { updates.era             = result.era;                               filled.push('era'); }
      if (result.year)          { updates.year            = String(result.year);                      filled.push('year'); }
      if (result.style && validStyles.includes(result.style)) { updates.style = result.style;        filled.push('style'); }
      if (result.tour_or_event)    { updates.tour_or_event   = result.tour_or_event;   filled.push('tour/event'); }
      if (result.graphic_keywords) { updates.graphic_keywords = result.graphic_keywords; }
      if (result.sport)            { updates.sport           = result.sport; }
      if (result.location)         { updates.location        = result.location; }

      const noteParts = [
        result.graphic_description,
        result.tour_or_event   ? `Tour/event: ${result.tour_or_event}` : null,
        result.front_text      ? `Front text: ${result.front_text}` : null,
        result.back_text       ? `Back text: ${result.back_text}` : null,
        result.tag_brand       ? `Tag: ${result.tag_brand}` : null,
        result.stitch_type     ? `Stitching: ${result.stitch_type}` : null,
        result.notes,
      ].filter(Boolean);
      if (noteParts.length > 0) { updates.notes = noteParts.join('\n'); filled.push('notes'); }

      setAiFields(filled);
      setForm((f) => ({ ...f, ...updates }));

      // Trigger eBay search immediately with the extracted values — can't wait for form state to settle
      await searchEbay({
        brand:            updates.brand            ?? form.brand,
        style:            updates.style            ?? form.style,
        era:              updates.era              ?? form.era,
        year:             updates.year             ?? form.year,
        tour_or_event:    updates.tour_or_event    ?? form.tour_or_event    ?? '',
        graphic_keywords: updates.graphic_keywords ?? form.graphic_keywords ?? '',
        sport:            updates.sport            ?? form.sport            ?? '',
        location:         updates.location         ?? form.location         ?? '',
      });
    } catch (err) {
      setAiError(err.message || 'Photo analysis failed.');
    } finally {
      setAiAnalyzing(false);
    }
  }

  function handleFileSelect(slotKey, file) {
    setSlots((prev) => ({ ...prev, [slotKey]: { ...prev[slotKey], pendingFile: file, removed: false } }));
  }

  function handleRemove(slotKey) {
    setSlots((prev) => ({ ...prev, [slotKey]: { ...prev[slotKey], pendingFile: null, removed: true } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      brand: form.brand.trim(),
      era: form.era.trim() || null,
      year: form.year ? parseInt(form.year, 10) : null,
      style: form.style,
      size: form.size.trim() || null,
      condition: form.condition,
      purchase_price: form.purchase_price !== '' ? parseFloat(form.purchase_price) : null,
      purchase_date: form.purchase_date || null,
      current_value: form.current_value !== '' ? parseFloat(form.current_value) : null,
      valuation_notes: form.valuation_notes.trim() || null,
      notes: form.notes.trim() || null,
      tour_or_event: form.tour_or_event.trim() || null,
      graphic_keywords: form.graphic_keywords.trim() || null,
      sport: form.sport.trim() || null,
      location: form.location.trim() || null,
    };

    const { data: saved, error: saveError } = isEdit
      ? await supabase.from('shirts').update(payload).eq('id', id).select().single()
      : await supabase.from('shirts').insert({ ...payload, user_id: user?.id }).select().single();

    if (saveError) { setError(saveError.message); setSaving(false); return; }

    const shirtId = isEdit ? id : saved.id;

    const pendingSlots = PHOTO_SLOTS.filter(({ key }) => slots[key].pendingFile);
    const uploadedPhotos = [];

    for (const { key, label } of pendingSlots) {
      setUploadProgress(`Compressing ${label}…`);
      const file = await compressImage(slots[key].pendingFile);
      setUploadProgress(`Uploading ${label}…`);
      const path = `shirts/${shirtId}/${key}`;

      const { error: uploadError } = await supabase.storage
        .from('shirt-photos')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setError(`Photo upload failed (${label}): ${uploadError.message}`);
        setSaving(false);
        setUploadProgress('');
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('shirt-photos').getPublicUrl(path);
      uploadedPhotos.push({ slot: key, url: publicUrl });
    }

    setUploadProgress('');

    const uploadedKeys = new Set(uploadedPhotos.map((u) => u.slot));
    const keptPhotos = PHOTO_SLOTS
      .filter(({ key }) => !slots[key].removed && slots[key].url && !uploadedKeys.has(key))
      .map(({ key }) => ({ slot: key, url: slots[key].url }));

    const finalPhotos = [...keptPhotos, ...uploadedPhotos];
    const hasPhotoChanges = uploadedPhotos.length > 0 || PHOTO_SLOTS.some(({ key }) => slots[key].removed);

    if (hasPhotoChanges) {
      const { error: photoError } = await supabase.from('shirts').update({ photos: finalPhotos }).eq('id', shirtId);
      if (photoError) { setError(photoError.message); setSaving(false); return; }
    }

    if (payload.current_value != null) {
      await supabase.from('price_history').insert({
        shirt_id: shirtId,
        price: payload.current_value,
        source: 'manual entry',
      });
    }

    setSaving(false);
    navigate(`/shirts/${shirtId}`);
  }

  const checkedListings = ebayListings.filter((_, i) => checkedIds.has(i));
  const liveAvg = checkedListings.length > 0
    ? checkedListings.reduce((s, l) => s + l.price, 0) / checkedListings.length
    : null;

  const isBusy = saving;
  const buttonLabel = uploadProgress || (saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Shirt');

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-50 tracking-tight">
          {isEdit ? 'Edit Shirt' : 'Add New Shirt'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {isEdit ? 'Update the details for this shirt.' : 'Add a new shirt to your vault.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identification */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800/60 p-6">
          <SectionHeading>Identification</SectionHeading>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Brand" required>
                <input required value={form.brand} onChange={set('brand')} className={inputCls} placeholder="e.g. Hanes, Screen Stars, Fruit of the Loom…" />
              </Field>
            </div>
            <Field label="Style" required>
              <select value={form.style} onChange={set('style')} className={inputCls}>
                {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Era">
              <input value={form.era} onChange={set('era')} className={inputCls} placeholder="e.g. 80s, Early 90s" />
            </Field>
            <Field label="Year">
              <input type="number" value={form.year} onChange={set('year')} className={inputCls} placeholder="e.g. 1987" min="1900" max="2100" />
            </Field>
            <Field label="Size">
              <input value={form.size} onChange={set('size')} className={inputCls} placeholder="e.g. L, XL, Fits M" />
            </Field>
          </div>
        </section>

        {/* Photos */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Photos</span>
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">JPEG · PNG · HEIC · WebP · max 10 MB</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {PHOTO_SLOTS.map(({ key, label }) => (
              <PhotoSlot
                key={key}
                slotKey={key}
                label={label}
                currentUrl={!slots[key].removed ? slots[key].url : null}
                pendingFile={slots[key].pendingFile}
                onFileSelect={handleFileSelect}
                onRemove={handleRemove}
              />
            ))}
          </div>

          {/* AI photo analysis — only available when a new front photo is staged */}
          {slots.front.pendingFile && (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={analyzePhoto}
                disabled={aiAnalyzing || ebaySearching}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 hover:border-violet-500/50 text-violet-300 hover:text-violet-200 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
              >
                {aiAnalyzing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing photo…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Analyze Photo with AI
                  </>
                )}
              </button>

              {aiError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {aiError}
                </div>
              )}

              {aiFields.length > 0 && !aiAnalyzing && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-violet-300">
                    AI filled <span className="font-semibold">{aiFields.join(', ')}</span> — eBay search triggered
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Condition */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800/60 p-6">
          <SectionHeading>Condition</SectionHeading>
          <Field label="Condition" required>
            <div className="flex gap-2 flex-wrap mt-1">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, condition: c }))}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                    form.condition === c
                      ? 'bg-amber-500 border-amber-500 text-gray-950 shadow-glow-sm'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
        </section>

        {/* Financial */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800/60 p-6">
          <SectionHeading>Financials</SectionHeading>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Purchase Price ($)">
              <input type="number" step="0.01" value={form.purchase_price} onChange={set('purchase_price')} className={inputCls} placeholder="0.00" min="0" />
            </Field>
            <Field label="Purchase Date">
              <input type="date" value={form.purchase_date} onChange={set('purchase_date')} className={`${inputCls} [color-scheme:dark]`} />
            </Field>
            <Field label="Current Est. Value ($)">
              <input type="number" step="0.01" value={form.current_value} onChange={set('current_value')} className={inputCls} placeholder="0.00" min="0" />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => searchEbay()}
                disabled={!form.brand || ebaySearching}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white text-sm font-medium rounded-xl transition-all disabled:opacity-40"
              >
                {ebaySearching ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search eBay
                  </>
                )}
              </button>
            </div>
          </div>

          {/* eBay comps results */}
          {ebayError && (
            <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {ebayError}
            </div>
          )}
          {ebayListings.length > 0 && (
            <div className="mt-4 space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 uppercase tracking-wider truncate mr-3">
                  eBay comps — <span className="text-gray-400 normal-case">"{ebayQuery}"</span>
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setCheckedIds(new Set(ebayListings.map((_, i) => i)))}
                    className="text-xs text-gray-600 hover:text-amber-400 transition-colors"
                  >
                    All
                  </button>
                  <span className="text-gray-700">·</span>
                  <button
                    type="button"
                    onClick={() => setCheckedIds(new Set())}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Listing rows with checkboxes */}
              <div className="space-y-1.5">
                {ebayListings.map((listing, i) => {
                  const checked = checkedIds.has(i);
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        checked
                          ? 'bg-gray-800/60 border-gray-700/40'
                          : 'bg-gray-900/30 border-gray-800/20 opacity-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleCheck(i)}
                        className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          checked
                            ? 'bg-amber-500 border-amber-500'
                            : 'border-gray-600 bg-transparent hover:border-gray-400'
                        }`}
                        aria-label={checked ? 'Exclude from average' : 'Include in average'}
                      >
                        {checked && (
                          <svg className="w-3 h-3 text-gray-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Thumbnail */}
                      {listing.image ? (
                        <img src={listing.image} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-gray-700" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-gray-700 flex-shrink-0" />
                      )}

                      {/* Title + AI flag */}
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-0 group/link"
                      >
                        <p className="text-sm text-gray-300 leading-snug line-clamp-2 group-hover/link:text-amber-400 transition-colors">
                          {listing.title}
                        </p>
                        {!listing.kept && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-orange-400/80 bg-orange-500/10 px-1.5 py-0.5 rounded">
                            AI flagged · may be reprint
                          </span>
                        )}
                      </a>

                      {/* Price */}
                      <span className={`text-sm font-bold tabular-nums flex-shrink-0 ml-1 ${
                        checked ? 'text-amber-400' : 'text-gray-600 line-through'
                      }`}>
                        ${listing.price.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Load More */}
              <button
                type="button"
                onClick={loadMore}
                disabled={ebaySearching || ebayNoMore}
                className="w-full py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-300 border border-gray-700/60 hover:border-gray-600 rounded-xl transition-all disabled:opacity-40 disabled:cursor-default"
              >
                {ebaySearching ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading more…
                  </span>
                ) : ebayNoMore ? 'No more results' : 'Load More'}
              </button>

              {/* Live average + Use This Average */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div>
                  <p className="text-[10px] text-amber-400/60 font-semibold uppercase tracking-wider">
                    {checkedIds.size} comp{checkedIds.size !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xl font-bold text-amber-400 tabular-nums mt-0.5">
                    {liveAvg != null ? `$${liveAvg.toFixed(2)}` : '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (liveAvg != null) setForm((f) => ({ ...f, current_value: liveAvg.toFixed(2) }));
                  }}
                  disabled={liveAvg == null}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-sm"
                >
                  Use This Average
                </button>
              </div>
            </div>
          )}
          {!ebaySearching && !ebayError && ebayListings.length === 0 && ebayQuery && (
            <div className="mt-4 text-sm text-gray-500 bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3 text-center">
              No listings found for "{ebayQuery}"
            </div>
          )}

          <div className="mt-4">
            <Field label="Valuation Notes">
              <textarea value={form.valuation_notes} onChange={set('valuation_notes')} rows={2} className={inputCls} placeholder="Sources, comp sales, reasoning…" />
            </Field>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800/60 p-6">
          <SectionHeading>Notes</SectionHeading>
          <textarea value={form.notes} onChange={set('notes')} rows={4} className={inputCls} placeholder="Provenance, print details, quirks, repairs…" />
        </section>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-3 pb-4">
          <button
            type="submit"
            disabled={isBusy}
            className="px-7 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 font-semibold rounded-xl transition-all duration-150 disabled:opacity-40 shadow-glow-sm hover:shadow-glow"
          >
            {buttonLabel}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/shirts/${id}` : '/collection')}
            disabled={isBusy}
            className="px-7 py-2.5 border border-gray-700 text-gray-500 hover:text-gray-200 hover:border-gray-600 font-semibold rounded-xl transition-all duration-150 disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
