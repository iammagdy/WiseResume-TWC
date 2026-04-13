// ============================================================
// WiseResume → Kinde Brand Injector
// Paste this in your browser console while on the Kinde
// Design > Theme page (app.kinde.com/.../design/theme)
// ============================================================

(async () => {
  const BRAND = {
    button:     '#9D211B',
    link:       '#9D211B',
    buttonText: '#FFFFFF',
    background: '#FFFFFF',
  };

  // React input trick — bypasses controlled-component locks
  function reactSet(input, value) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function findInputByLabel(keyword) {
    const allText = Array.from(document.querySelectorAll('label, [class*="label"], p, span, legend, h3, h4'));
    for (const el of allText) {
      if (!el.textContent.trim().toLowerCase().includes(keyword.toLowerCase())) continue;
      // Check for associated input via "for" attr
      const forId = el.getAttribute('for');
      if (forId) {
        const input = document.getElementById(forId);
        if (input) return input;
      }
      // Walk siblings / children
      const parent = el.closest('[class*="field"], [class*="form"], [class*="row"], [class*="group"], [class*="item"], div');
      if (parent) {
        const inp = parent.querySelector('input[type="text"], input[type="color"], input:not([type="submit"]):not([type="button"]):not([type="checkbox"])');
        if (inp) return inp;
      }
    }
    return null;
  }

  let changed = 0;

  const targets = [
    { keywords: ['button color', 'button background', 'primary button', 'btn color'], value: BRAND.button },
    { keywords: ['button text', 'button label', 'btn text'],                           value: BRAND.buttonText },
    { keywords: ['link color', 'link'],                                                value: BRAND.link },
    { keywords: ['background color', 'body background', 'page background'],            value: BRAND.background },
  ];

  for (const { keywords, value } of targets) {
    let found = null;
    for (const kw of keywords) {
      found = findInputByLabel(kw);
      if (found) break;
    }
    if (found) {
      const oldVal = found.value;
      reactSet(found, value);
      await sleep(150);
      console.log(`✅ [${keywords[0]}] ${oldVal} → ${value}`);
      changed++;
    } else {
      console.warn(`⚠️  Could not find input for: ${keywords[0]}`);
    }
  }

  // ── Fallback: if targeted search found nothing, dump all text inputs ────────
  if (changed === 0) {
    console.warn('No fields found via label search. Dumping all visible text inputs:');
    document.querySelectorAll('input[type="text"], input[type="color"]').forEach((inp, i) => {
      console.log(i, inp.id, inp.name, inp.placeholder, inp.value, inp.closest('label,div')?.textContent?.slice(0, 60));
    });
    console.warn('Please share this output so the selectors can be refined.');
    return;
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  await sleep(300);
  const saveBtn = Array.from(document.querySelectorAll('button')).find(b => {
    const t = b.textContent.trim().toLowerCase();
    return t === 'save' || t === 'save changes' || t === 'apply' || t === 'update';
  });

  if (saveBtn) {
    saveBtn.click();
    console.log('✅ Save clicked! Wait for the success toast, then verify your auth page.');
  } else {
    console.warn('⚠️  Save button not found — please click Save manually.');
    // Show all buttons to help debug
    document.querySelectorAll('button').forEach(b => console.log('Button:', JSON.stringify(b.textContent.trim())));
  }

  console.log(`\n🎨 Done — ${changed} color(s) set to WiseResume brand.`);
  console.log('Button color:', BRAND.button);
  console.log('Link color:  ', BRAND.link);
  console.log('After saving, visit: https://thewisecloud.kinde.com to verify.');
})();
