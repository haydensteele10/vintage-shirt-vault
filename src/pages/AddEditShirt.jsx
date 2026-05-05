import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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
};

const EMPTY_SLOTS = {
  front: { url: null, pendingFile: null, removed: false },
  back:  { url: null, pendingFile: null, removed: false },
  tags:  { url: null, pendingFile: null, removed: false },
};

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
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
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide text-center">{label}</p>
      <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 relative group">
        {displayUrl ? (
          <>
            <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
            {pendingFile && (
              <span className="absolute bottom-1.5 left-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                NEW
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(slotKey)}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Remove ${label} photo`}
            >
              ✕
            </button>
          </>
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center gap-1.5 cursor-pointer text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

export default function AddEditShirt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && id !== 'new';

  const [form, setForm] = useState(EMPTY_FORM);
  const [slots, setSlots] = useState(EMPTY_SLOTS);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState(null);

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
    };

    // 1. Save text fields first (need shirtId before we can build storage paths)
    const { data: saved, error: saveError } = isEdit
      ? await supabase.from('shirts').update(payload).eq('id', id).select().single()
      : await supabase.from('shirts').insert(payload).select().single();

    if (saveError) { setError(saveError.message); setSaving(false); return; }

    const shirtId = isEdit ? id : saved.id;

    // 2. Upload any pending photos
    const pendingSlots = PHOTO_SLOTS.filter(({ key }) => slots[key].pendingFile);
    const uploadedPhotos = [];

    for (const { key, label } of pendingSlots) {
      setUploadProgress(`Uploading ${label}…`);
      const file = slots[key].pendingFile;
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

    // 3. Merge: keep un-removed existing photos, add/replace with uploads
    const uploadedKeys = new Set(uploadedPhotos.map((u) => u.slot));
    const keptPhotos = PHOTO_SLOTS
      .filter(({ key }) => !slots[key].removed && slots[key].url && !uploadedKeys.has(key))
      .map(({ key }) => ({ slot: key, url: slots[key].url }));

    const finalPhotos = [...keptPhotos, ...uploadedPhotos];
    const hasPhotoChanges = uploadedPhotos.length > 0 || PHOTO_SLOTS.some(({ key }) => slots[key].removed);

    if (hasPhotoChanges) {
      const { error: photoError } = await supabase
        .from('shirts')
        .update({ photos: finalPhotos })
        .eq('id', shirtId);
      if (photoError) { setError(photoError.message); setSaving(false); return; }
    }

    // 4. Log to price_history when current_value is set
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

  const isBusy = saving;
  const buttonLabel = uploadProgress || (saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Shirt');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Shirt' : 'Add New Shirt'}</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identification */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 border-b border-gray-50 pb-2">Identification</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Brand" required>
                <input required value={form.brand} onChange={set('brand')} className={inputCls} placeholder="e.g. Hanes, Screen Stars…" />
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
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-baseline justify-between border-b border-gray-50 pb-2">
            <h2 className="font-semibold text-gray-800">Photos</h2>
            <span className="text-xs text-gray-400">JPEG · PNG · HEIC · WebP · max 10 MB</span>
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
        </section>

        {/* Condition */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 border-b border-gray-50 pb-2">Condition</h2>
          <Field label="Condition" required>
            <div className="flex gap-2 flex-wrap">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, condition: c }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.condition === c
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
        </section>

        {/* Financial */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 border-b border-gray-50 pb-2">Financials</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Purchase Price ($)">
              <input type="number" step="0.01" value={form.purchase_price} onChange={set('purchase_price')} className={inputCls} placeholder="0.00" min="0" />
            </Field>
            <Field label="Purchase Date">
              <input type="date" value={form.purchase_date} onChange={set('purchase_date')} className={inputCls} />
            </Field>
            <Field label="Current Est. Value ($)">
              <input type="number" step="0.01" value={form.current_value} onChange={set('current_value')} className={inputCls} placeholder="0.00" min="0" />
            </Field>
          </div>
          <Field label="Valuation Notes">
            <textarea value={form.valuation_notes} onChange={set('valuation_notes')} rows={2} className={inputCls} placeholder="Sources, comp sales, reasoning…" />
          </Field>
        </section>

        {/* Notes */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 border-b border-gray-50 pb-2">Notes</h2>
          <textarea value={form.notes} onChange={set('notes')} rows={3} className={inputCls} placeholder="Provenance, print details, quirks…" />
        </section>

        {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isBusy}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {buttonLabel}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/shirts/${id}` : '/collection')}
            disabled={isBusy}
            className="px-6 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold rounded-lg transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
