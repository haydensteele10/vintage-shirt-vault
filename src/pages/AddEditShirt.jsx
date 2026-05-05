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

    const { data: saved, error: saveError } = isEdit
      ? await supabase.from('shirts').update(payload).eq('id', id).select().single()
      : await supabase.from('shirts').insert(payload).select().single();

    if (saveError) { setError(saveError.message); setSaving(false); return; }

    const shirtId = isEdit ? id : saved.id;

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
            <div className="col-span-2 sm:col-span-1">
              <Field label="Current Est. Value ($)">
                <input type="number" step="0.01" value={form.current_value} onChange={set('current_value')} className={inputCls} placeholder="0.00" min="0" />
              </Field>
            </div>
          </div>
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
