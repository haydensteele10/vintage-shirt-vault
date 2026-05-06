import { useState, useMemo } from 'react';

// ─── Tag data ─────────────────────────────────────────────────────────────────

const TAG_DATA = [
  {
    id: 'screen-stars',
    brand: 'Screen Stars',
    subtitle: 'by Fruit of the Loom',
    overview: 'One of the most iconic blank tee brands in vintage collecting. Originally produced by Best Company before Fruit of the Loom acquired it in 1982. Ubiquitous on 1970s–90s band tees, concert shirts, and souvenir tees.',
    eras: [
      {
        years: '1960s – 1975',
        label: 'Best Company Era',
        features: ['Made by Best Company (not FotL)', 'Bright yellow tag', 'Bold "Screen Stars" text', 'Union made label', 'Single stitch throughout', 'Heavy 100% cotton'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1976 – 1982',
        label: '"Screen Stars Best" Era',
        features: ['"Screen Stars Best" wording on tag', 'White tag with orange or red text', 'Single stitch construction', 'Union label often present', '"Made in USA" printed'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1982 – 1990',
        label: 'Early Fruit of the Loom Era',
        features: ['FotL branding added to tag', 'Star graphic appears on tag', 'Single stitch on pre-1987 examples', 'Double stitch begins late 1980s', '"Made in USA" still common'],
        singleStitch: true, madeInUSA: true, valueImpact: 'medium',
      },
      {
        years: '1990 – 1997',
        label: 'Blue Circle Era',
        features: ['Distinctive blue circle tag design', 'Double stitch standard', 'Poly/cotton blends introduced', 'FotL logos prominent', 'Less desirable for collectors'],
        singleStitch: false, madeInUSA: false, valueImpact: 'low',
      },
    ],
  },
  {
    id: 'champion',
    brand: 'Champion',
    subtitle: 'Champion Products / HanesBrands',
    overview: 'One of the oldest and most prestigious American sportswear brands. Their tees — especially the "Bar Tack" era with the large C logo — are among the most coveted in vintage collecting. Reverse Weave sweatshirts are legendary.',
    eras: [
      {
        years: '1970s – 1981',
        label: 'Circle C Era',
        features: ['"C" in a circle on white tag', '"Champion Products" text', 'Made in USA', 'Single stitch throughout', 'Heavy jersey cotton', 'Athletic and university market'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1982 – 1987',
        label: 'Running Man Era',
        features: ['Running Man logo introduced', 'Made in USA', 'Single stitch construction', 'Heavy cotton (often 50/50)', '"Champion USA" tag wording'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1988 – 1993',
        label: 'Bar Tack / Big C Era — Most Collectible',
        features: ['Large "C" logo on chest', 'Bar tack stitching at collar — key identifier', 'Made in USA', 'Single stitch construction', 'Thick ribbed collar', 'Reversed seam under arm on tees'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1994 – 1997',
        label: 'Late USA Era',
        features: ['Double stitch begins ~1993–94', 'Made in USA continues', 'Bar tack detail still present', 'Slightly lighter cotton weights', 'Still collectible — USA-made'],
        singleStitch: false, madeInUSA: true, valueImpact: 'medium',
      },
      {
        years: '1998+',
        label: 'HanesBrands Era',
        features: ['Acquired by HanesBrands', 'Double stitch standard', 'Manufacturing moves offshore', 'Lighter cotton weights', '"Heritage" labels appear for marketing'],
        singleStitch: false, madeInUSA: false, valueImpact: 'low',
      },
    ],
  },
  {
    id: 'hanes',
    brand: 'Hanes',
    subtitle: 'Sara Lee / HanesBrands',
    overview: 'An American staple since the early 1900s. Hanes tees from the 1970s–80s are highly collectible — the Beefy-T sub-brand especially so. Earlier single-stitch examples with "Made in USA" command the most attention from collectors.',
    eras: [
      {
        years: '1960s – 1977',
        label: 'Classic Era',
        features: ['"Hanes" in bold script on white tag', '"Made in USA" with state label', 'Single stitch throughout', 'Heavy cotton', 'No Beefy-T branding yet'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1978 – 1989',
        label: 'Beefy-T Launch Era',
        features: ['Beefy-T sub-brand introduced ~1975–78', 'Oval Hanes logo on tag', 'Single stitch on early examples', '"Made in USA" present', 'Heavyweight 100% cotton'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1990 – 1998',
        label: '50/50 Blend Era',
        features: ['White tag with clean black text', '50/50 cotton/polyester blends common', 'Double stitch standard by 1992', '"Made in USA" still on some lots', 'Softer hand feel'],
        singleStitch: false, madeInUSA: true, valueImpact: 'medium',
      },
      {
        years: '1999+',
        label: 'Tag-less Era',
        features: ['Heat transfer neck labels replace woven tags', 'Tag-less design on premium lines', 'Offshore manufacturing standard', 'Modern cotton blends'],
        singleStitch: false, madeInUSA: false, valueImpact: 'low',
      },
    ],
  },
  {
    id: 'fruit-of-the-loom',
    brand: 'Fruit of the Loom',
    subtitle: 'FotL',
    overview: 'One of the dominant blank tee manufacturers from the 1960s onward. Vintage FotL from the 1970s–80s features heavy cotton and single-stitch construction. The brand also acquired Screen Stars in 1982.',
    eras: [
      {
        years: '1960s – 1979',
        label: 'Early Fruit Tag',
        features: ['Distinctive fruit logo tag (apple, grapes, leaves)', 'Single stitch throughout', 'Heavy cotton', '"Made in USA"', 'Union labels common'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1980 – 1991',
        label: 'Classic FotL Era',
        features: ['Updated fruit logo', 'Single stitch on pre-1988 examples', 'Double stitch begins ~1988', '"Made in USA" present', '100% cotton standard'],
        singleStitch: true, madeInUSA: true, valueImpact: 'medium',
      },
      {
        years: '1992+',
        label: 'Transition Era',
        features: ['Simplified fruit logo', 'Double stitch standard', 'Manufacturing shifts offshore', '"Ringspun" cotton options appear', 'Screen Stars branding folded in'],
        singleStitch: false, madeInUSA: false, valueImpact: 'low',
      },
    ],
  },
  {
    id: 'salem-sportswear',
    brand: 'Salem Sportswear',
    subtitle: 'Salem Manufacturing',
    overview: 'One of the most recognizable names in vintage licensed sports tees from the late 1980s and early \'90s. Known for heavyweight cotton, single-stitch construction, and bold graphics. Highly collectible — especially NBA, NFL, and band license tees.',
    eras: [
      {
        years: '1985 – 1991',
        label: 'Peak Era — Highly Collectible',
        features: ['Salem logo tag with "Sportswear" text', 'Single stitch throughout', 'Heavyweight 100% cotton', '"Made in USA" or "Made in Honduras"', 'Thick collar with contrasting neck rib', 'Licensed sports or band graphics standard'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1992 – 1997',
        label: 'Late Era',
        features: ['Double stitch begins mid-1990s', 'Manufacturing shifts offshore', 'Still heavyweight cotton on some lots', '"Made in USA" less common', 'Brand discontinued by late 1990s'],
        singleStitch: false, madeInUSA: false, valueImpact: 'medium',
      },
    ],
  },
  {
    id: 'nutmeg-mills',
    brand: 'Nutmeg Mills',
    subtitle: 'Sports licensing specialist',
    overview: 'A major sports licensing powerhouse from 1977–1997, producing tees for NFL, NBA, MLB, and college teams. Known for heavy cotton construction and vibrant screen prints. Domestic-made examples from the 1980s are prime vintage.',
    eras: [
      {
        years: '1977 – 1990',
        label: 'Made in USA Peak',
        features: ['Nutmeg tag with state of manufacture label', 'Single stitch throughout', 'Heavy 100% cotton', '"Made in USA"', 'Official league license hang tags often still attached', 'NFLPA / NBAPA license text on tag'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1991 – 1997',
        label: 'Late Era',
        features: ['Manufacturing transitions to Honduras or Mexico', 'Double stitch common', 'Still heavy cotton on some lots', 'Brand acquired and discontinued ~1997'],
        singleStitch: false, madeInUSA: false, valueImpact: 'medium',
      },
    ],
  },
  {
    id: 'logo-7',
    brand: 'Logo 7',
    subtitle: 'Sports Specialties / VF Corporation',
    overview: 'A major licensed sports merchandise brand from the mid-1970s through 1997. Particularly dominant in NFL, NBA, and MLB apparel. Their heavyweight single-stitch tees from the 1980s are prized collectibles.',
    eras: [
      {
        years: '1975 – 1989',
        label: 'Peak Era',
        features: ['"Logo 7" tag in block text', 'Made in USA', 'Single stitch throughout', 'Heavyweight cotton', 'Official licensing tags sewn into hem', 'NFLPA / official logo on hem tag'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1990 – 1997',
        label: 'Late Era',
        features: ['VF Corporation acquires brand', 'Double stitch begins', '"Made in Honduras" common', 'Still heavyweight cotton', 'Brand discontinued after 1997'],
        singleStitch: false, madeInUSA: false, valueImpact: 'medium',
      },
    ],
  },
  {
    id: 'russell-athletic',
    brand: 'Russell Athletic',
    subtitle: 'Russell Corporation (est. 1902)',
    overview: 'One of the oldest American athletic wear manufacturers, Russell is known for thick jersey cotton and solid construction. Domestic-made examples from the 1970s–80s are collectible. They also launched the Jerzees sub-brand in 1984.',
    eras: [
      {
        years: '1970s – 1984',
        label: 'Pre-Jerzees Era',
        features: ['"Russell Athletic" on tag', 'Made in USA', 'Heavyweight jersey cotton', 'Single stitch construction', 'Often found on university and athletic shirts', 'No Jerzees branding yet'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1985 – 1993',
        label: 'Jerzees Launch Era',
        features: ['Jerzees sub-brand launched 1984 as value line', 'Russell Athletic continues as premium line', 'Made in USA', 'Single stitch into early 1990s', 'Double stitch begins ~1992'],
        singleStitch: true, madeInUSA: true, valueImpact: 'medium',
      },
      {
        years: '1994+',
        label: 'Late Era',
        features: ['Manufacturing shifts to Honduras and Mexico', 'Double stitch standard', 'Lighter cotton blends', 'Acquired by Berkshire Hathaway (2006)'],
        singleStitch: false, madeInUSA: false, valueImpact: 'low',
      },
    ],
  },
  {
    id: 'stedman',
    brand: 'Stedman',
    subtitle: 'Stedman Corporation',
    overview: 'A respected American blank tee manufacturer known for heavier weight cotton and clean construction. Stedman\'s domestic-made examples from the 1970s–90s are prized in the screen printing trade and among vintage collectors.',
    eras: [
      {
        years: '1970s – 1985',
        label: 'USA-Made Era',
        features: ['"Stedman" in bold block text on white tag', 'Made in USA', 'Heavy 6oz+ cotton weight', 'Single stitch construction', 'Thick ribbed collar'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1986 – 1995',
        label: 'Transition Era',
        features: ['Updated tag design with smaller text', 'Single stitch into early 1990s', '"Made in USA" still on some runs', 'Heavier weights remain popular with printers'],
        singleStitch: true, madeInUSA: true, valueImpact: 'medium',
      },
      {
        years: '1996+',
        label: 'Global Manufacturing Era',
        features: ['Manufacturing shifts to Central America and Asia', 'Double stitch standard', 'Lighter cotton weights', 'Still widely used for promotional printing'],
        singleStitch: false, madeInUSA: false, valueImpact: 'low',
      },
    ],
  },
  {
    id: 'delta-pro-weight',
    brand: 'Delta Pro Weight',
    subtitle: 'Delta Woodside',
    overview: 'Delta\'s Pro Weight line is one of the most collectible blank tees for the vintage market. Made in the USA with heavy cotton, single stitch, and a classic tube-knit construction. Common on 1980s–90s tourist and souvenir shirts.',
    eras: [
      {
        years: '1976 – 1993',
        label: 'Made in USA Era — Most Collectible',
        features: ['"Pro Weight" text on tag', 'Delta logo with triangle graphic', 'Heavy 6oz+ cotton', 'Single stitch construction', 'Tube body (no side seams) — key identifier', '"Made in USA"'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1993 – 2000',
        label: 'Late Domestic Era',
        features: ['Double stitch begins', 'Made in USA on some styles', '"Pro Weight" branding continues', 'Cotton weight varies by run'],
        singleStitch: false, madeInUSA: true, valueImpact: 'medium',
      },
    ],
  },
  {
    id: 'jerzees',
    brand: 'Jerzees',
    subtitle: 'Russell Athletic sub-brand (est. 1984)',
    overview: 'Launched by Russell Athletic in 1984 as a value-priced blank. Jerzees tees are extremely common on 1980s–90s souvenir and novelty shirts. Earlier union-made examples with "Made in USA" are more collectible than later offshore runs.',
    eras: [
      {
        years: '1984 – 1991',
        label: 'Early Russell Era',
        features: ['"Jerzees by Russell" on tag — key phrase', 'Made in USA on early runs', 'Union made on some lots', 'Single stitch on 1984–87 examples', 'Heavy cotton'],
        singleStitch: true, madeInUSA: true, valueImpact: 'medium',
      },
      {
        years: '1992+',
        label: 'Mainstream Era',
        features: ['Double stitch standard', '50/50 cotton/polyester blends introduced', 'Manufacturing shifts offshore', 'Jerzees logo becomes more stylized', 'Very common on tourist and souvenir shirts'],
        singleStitch: false, madeInUSA: false, valueImpact: 'low',
      },
    ],
  },
  {
    id: 'tultex',
    brand: 'Tultex',
    subtitle: 'Tultex Corporation (bankrupt 1999)',
    overview: 'Virginia-based Tultex made American clothing from 1937 until bankruptcy in 1999. Their domestic-made tees are prized collectibles — the brand\'s collapse means any "Made in USA" Tultex is guaranteed vintage. Very common on 1990s tourist and novelty shirts.',
    eras: [
      {
        years: '1937 – 1985',
        label: 'Early Era',
        features: ['"Tultex" on white or cream tag', 'Made in USA (Virginia)', 'Heavy cotton', 'Single stitch throughout', 'Union made', 'Less common finds — earlier examples rarer'],
        singleStitch: true, madeInUSA: true, valueImpact: 'high',
      },
      {
        years: '1986 – 1999',
        label: 'Peak Collection Era',
        features: ['Updated Tultex logo tag', 'Made in USA until bankruptcy 1999', 'Single stitch into early 1990s', 'Double stitch from ~1993', 'Very common on souvenir and tourist tees', 'Any example is guaranteed vintage due to 1999 bankruptcy'],
        singleStitch: true, madeInUSA: true, valueImpact: 'medium',
      },
    ],
  },
  {
    id: 'signal',
    brand: 'Signal',
    subtitle: 'Signal Apparel',
    overview: 'A Signal Apparel tag is a reliable indicator of a late 1970s–early 1990s American-made shirt. Signal was a mid-sized domestic manufacturer whose tags appear on regional souvenir and sports tees. Went bankrupt in the late 1990s.',
    eras: [
      {
        years: '1970s – 1988',
        label: 'Heavy Cotton Era',
        features: ['"Signal" in block text on white tag', 'Made in USA', 'Heavy cotton, sometimes 50/50', 'Single stitch construction', 'Union label on earlier examples'],
        singleStitch: true, madeInUSA: true, valueImpact: 'medium',
      },
      {
        years: '1989 – 1998',
        label: 'Late Era',
        features: ['Double stitch begins', 'Lighter cotton weights', 'Still Made in USA on some runs', 'Brand declined as larger manufacturers dominated'],
        singleStitch: false, madeInUSA: true, valueImpact: 'low',
      },
    ],
  },
  {
    id: 'anvil-knitwear',
    brand: 'Anvil Knitwear',
    subtitle: 'Anvil / Gildan (acquired)',
    overview: 'A screen printing industry staple since 1972. Known for consistent quality and ringspun cotton options, Anvil tees are common on 1980s–90s promotional and concert shirts. Later acquired by Gildan.',
    eras: [
      {
        years: '1972 – 1988',
        label: 'Early USA Era',
        features: ['"Anvil Knitwear" on tag — full name', 'Made in USA', 'Heavy ringspun cotton', 'Single stitch construction', 'Popular in the screen printing trade', 'Union made on early lots'],
        singleStitch: true, madeInUSA: true, valueImpact: 'medium',
      },
      {
        years: '1989 – 2000',
        label: 'Transition Era',
        features: ['"Anvil" simplified logo tag', 'Double stitch begins', 'Mixed USA and offshore manufacturing', 'Ringspun cotton options expand', 'Common on band and event shirts'],
        singleStitch: false, madeInUSA: true, valueImpact: 'low',
      },
    ],
  },
];

// ─── Value impact config ───────────────────────────────────────────────────────

const IMPACT = {
  high:   { label: 'High Value',   bg: 'bg-amber-500/15',  text: 'text-amber-400',   border: 'border-l-amber-500/70'  },
  medium: { label: 'Mid Value',    bg: 'bg-blue-500/10',   text: 'text-blue-400',    border: 'border-l-blue-500/50'   },
  low:    { label: 'Lower Value',  bg: 'bg-gray-800/80',   text: 'text-gray-500',    border: 'border-l-gray-600/40'   },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ValueBadge({ impact }) {
  const cfg = IMPACT[impact];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function AttributeBadge({ label, color }) {
  const colors = {
    amber: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25',
    emerald: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25',
    gray: 'bg-gray-800 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${colors[color]}`}>
      {label}
    </span>
  );
}

function EraSection({ era }) {
  const borderColor = IMPACT[era.valueImpact].border;
  return (
    <div className={`border-l-2 ${borderColor} pl-3 py-1 space-y-2`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-200">{era.years}</span>
        <span className="text-[10px] text-gray-600">·</span>
        <span className="text-[10px] text-gray-500 italic">{era.label}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {era.singleStitch && <AttributeBadge label="Single Stitch" color="amber" />}
        {era.madeInUSA && <AttributeBadge label="Made in USA" color="emerald" />}
        <ValueBadge impact={era.valueImpact} />
      </div>
      <ul className="space-y-0.5">
        {era.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-[11px] text-gray-500 leading-relaxed">
            <span className="text-gray-700 mt-0.5 flex-shrink-0">›</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TagCard({ tag }) {
  const [expanded, setExpanded] = useState(true);
  const topEra = tag.eras.reduce((best, era) =>
    era.valueImpact === 'high' ? era : best, tag.eras[0]);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden flex flex-col">
      {/* Card header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between px-5 py-4 border-b border-gray-800/60 text-left hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gray-50">{tag.brand}</h3>
            {topEra?.valueImpact === 'high' && (
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                Highly Collectible
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600 mt-0.5">{tag.subtitle}</p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5 ml-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Card body */}
      {expanded && (
        <div className="px-5 py-4 space-y-4 flex-1">
          {/* Overview */}
          <p className="text-xs text-gray-500 leading-relaxed">{tag.overview}</p>

          {/* Era breakdown */}
          <div className="space-y-4">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Era Breakdown</p>
            {tag.eras.map((era) => (
              <EraSection key={era.years} era={era} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ValueGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gray-900 rounded-2xl border border-amber-500/20 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-100">What does this mean for value?</p>
            <p className="text-xs text-gray-500">How tag brands help date and price vintage shirts</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 flex-shrink-0 ml-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-800/60 px-5 py-5 space-y-5">
          {[
            {
              title: 'Single Stitch Construction',
              badge: { label: 'Single Stitch', color: 'text-amber-400 bg-amber-500/15' },
              body: 'Before roughly 1993–94, most American-made tees used single-stitch construction — one row of stitching along the sleeve and hem. This is one of the most reliable dating indicators in vintage collecting. A single-stitch hem is almost always pre-1994 and typically adds 20–40% to resale value.',
              tip: 'Check the hem and sleeve cuffs. One visible row of stitching = single stitch. Two rows = double stitch.',
            },
            {
              title: 'Made in USA',
              badge: { label: 'Made in USA', color: 'text-emerald-400 bg-emerald-500/15' },
              body: 'Domestic manufacturing largely ended in the 1990s as brands moved production overseas. "Made in USA" on a tag confirms the shirt predates the offshore shift, which happened brand by brand between roughly 1988 and 2000. A USA-made tag combined with single stitch is the strongest indicator of prime vintage.',
              tip: 'The specific state listed ("Made in USA / North Carolina") can narrow dating even further for some brands.',
            },
            {
              title: 'Union Labels',
              badge: null,
              body: 'ILGWU (International Ladies\' Garment Workers\' Union) or ACWA union labels sewn into the shirt confirm American union manufacturing, typically pre-1995. A "Made in USA" tag with a union label is the gold standard for pre-90s dating. Union labels often include a local number that can be researched for more precise dating.',
              tip: 'Union labels are usually sewn inside the shirt near the tag or along a side seam.',
            },
            {
              title: 'Brand Hierarchy',
              badge: null,
              body: 'Not all tags are equal. Champion, Salem Sportswear, Screen Stars Best, and Nutmeg Mills tees command significant premiums due to brand recognition and collector demand. Delta Pro Weight, Russell Athletic (USA-made), and early Hanes are also highly desirable. The specific brand matters as much as the construction.',
              tip: 'A Salem Sportswear single-stitch from 1988 will outsell a generic single-stitch from the same era. Brand names are a shorthand for quality and era.',
            },
            {
              title: 'Tag Condition',
              badge: null,
              body: 'An intact, uncut original tag adds to collectibility and authenticity. Many vintage shirts have had their tags cut out (to reduce scratching). While cut tags don\'t disqualify a shirt, original intact tags — especially for high-value brands — are preferable to buyers.',
              tip: 'Never cut tags on shirts you\'re planning to sell. Intact tags are part of the provenance.',
            },
          ].map((item) => (
            <div key={item.title} className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold text-gray-200">{item.title}</p>
                {item.badge && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${item.badge.color}`}>
                    {item.badge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{item.body}</p>
              <div className="flex items-start gap-2 bg-gray-800/60 rounded-xl px-3 py-2.5">
                <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-[11px] text-gray-400 leading-relaxed">{item.tip}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TagGuide() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TAG_DATA;
    return TAG_DATA.filter(
      (t) =>
        t.brand.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.overview.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="max-w-4xl pb-32 space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="space-y-1 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-50 tracking-tight">Tag Guide</h1>
            <p className="text-xs text-gray-600">Collector's reference · {TAG_DATA.length} brands</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed pt-1 pl-0">
          A reference guide to vintage clothing tags — learn how to date shirts, spot valuable construction details, and understand what each brand means for resale value.
        </p>
      </div>

      {/* ── Search bar ───────────────────────────────────────────────────────── */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search brands… e.g. Champion, Salem, Screen Stars"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800/80 rounded-2xl pl-10 pr-10 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Value guide ──────────────────────────────────────────────────────── */}
      {!query && <ValueGuide />}

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      {!query && (
        <div className="flex flex-wrap gap-2 px-1">
          <span className="text-[10px] text-gray-700 font-medium uppercase tracking-widest self-center">Era colors:</span>
          {Object.entries(IMPACT).map(([key, cfg]) => (
            <span key={key} className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${cfg.text}`}>
              <span className={`w-2.5 h-2.5 rounded-sm ${cfg.bg}`} />
              {cfg.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Tag cards ────────────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tag) => (
            <TagCard key={tag.id} tag={tag} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No brands match "{query}"</p>
          <button onClick={() => setQuery('')} className="text-xs text-amber-400 hover:text-amber-300 mt-2 transition-colors">
            Clear search
          </button>
        </div>
      )}

      {/* ── Footer note ──────────────────────────────────────────────────────── */}
      {!query && (
        <div className="border-t border-gray-800/60 pt-5 pb-2 text-center">
          <p className="text-xs text-gray-700 leading-relaxed">
            Date ranges are approximate — production overlapped between eras and varied by factory.<br />
            Always check construction details (single vs double stitch) alongside the tag.
          </p>
        </div>
      )}
    </div>
  );
}
