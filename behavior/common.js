const Store = (() => {
  /* ---------- Constants ---------- */

  const STORAGE_KEY = 'cozy-diary-v1';
  const WINDOW_NAME_PREFIX = `${STORAGE_KEY}=`;

  const COLORS = [
    '#f2a7bb', '#e86f93', '#b9d66b', '#7fa650',
    '#e8913f', '#c4562f', '#f5c96a', '#f7b79a',
    '#c9a4d8', '#8e4a78', '#8fc7b0', '#4f9d9a',
    '#8ec1e8', '#5b83b8', '#9a6b50', '#cfc3b8',
  ];

  // Labels for the "when do I write" setting of a pen name
  const WHEN = {
    any: 'Anytime',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
  };

  // Greeting on the shelf for each part of the day
  const GREET = {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    night: 'Late-night writing',
  };

  const ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };


  const uid = () => Math.random().toString(36).slice(2, 9);

  // Escape text before putting it inside an HTML string
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

  // Which part of the day a given moment belongs to
  const slot = (date = new Date()) => {
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  };

  const defaultAuthor = () => ({
    id: 'a-me',
    name: 'Me',
    emoji: '🌷',
    color: COLORS[0],
    when: 'any',
  });


  /* -first-run data */

  // Fixed ids so a reload never "loses" a notebook
  const seed = () => ({
    notebooks: [
      {
        id: 'nb-daily',
        name: 'Daily life',
        emoji: '🌸',
        color: COLORS[0],
        topics: [
          {
            id: 't-morn',
            name: 'Mornings',
            color: COLORS[2],
            entries: [
              {
                id: 'e-1',
                title: 'First cozy page',
                body: 'Tea, blanket, rain on the window. Starting here.',
                date: new Date().toISOString(),
                author: 'a-me',
                authorName: 'Me',
              },
            ],
          },
          {
            id: 't-grat',
            name: 'Gratitude',
            color: COLORS[4],
            entries: [],
          },
        ],
      },
      {
        id: 'nb-autumn',
        name: 'Autumn dreams',
        emoji: '🍂',
        color: COLORS[4],
        topics: [
          {
            id: 't-rec',
            name: 'Recipes',
            color: COLORS[6],
            entries: [],
          },
        ],
      },
    ],
    writer: {
      name: '',
      bio: '',
      defaultId: 'a-me',
      authors: [defaultAuthor()],
    },
  });


  const readRaw = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    } 
    catch (error) 
    {
      // Storage is blocked; try the fallback below.
    }

    if (window.name.startsWith(WINDOW_NAME_PREFIX)) 
    {
      return window.name.slice(WINDOW_NAME_PREFIX.length);
    }

    return null;
  };

  const writeRaw = (text) => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
      return;
    } 
    catch (error) 
    {
      // Storage is blocked; use the fallback below.
    }

    window.name = WINDOW_NAME_PREFIX + text;
  };

  // Fill in anything missing so the rest of the code can trust the shape
  const normalize = (raw) => {
    raw.notebooks = raw.notebooks || [];

    raw.notebooks.forEach((notebook) => {
      notebook.topics = notebook.topics || [];
      notebook.topics.forEach((topic) => {
        topic.entries = topic.entries || [];
      });
    });

    raw.writer = Object.assign(
      { name: '', bio: '', authors: [], defaultId: null },
      raw.writer
    );

    const { writer } = raw;

    if (!writer.authors.length) 
    {
      writer.authors.push(defaultAuthor());
    }

    if (!writer.authors.some((author) => author.id === writer.defaultId)) 
    {
      writer.defaultId = writer.authors[0].id;
    }

    return raw;
  };

  const load = () => {
    try {
      return normalize(JSON.parse(readRaw()) || seed());
    } 
    catch (error) 
    {
      return normalize(seed());
    }
  };

  const data = load();

  const save = () => writeRaw(JSON.stringify(data));

  save();
  window.addEventListener('pagehide', save);


  /* ---------- Pen names ---------- */

  // The pen name that matches the time of day, else the default one
  const authorFor = (date = new Date()) => {
    const { writer } = data;
    const currentSlot = slot(date);

    return (
      writer.authors.find((author) => author.when === currentSlot) ||
      writer.authors.find((author) => author.id === writer.defaultId) ||
      writer.authors[0]
    );
  };

  // A new page, signed with the pen name for right now
  const mkEntry = (title, body) => {
    const author = authorFor();

    return {
      id: uid(),
      title,
      body,
      date: new Date().toISOString(),
      author: author.id,
      authorName: author.name,
    };
  };


  return {
    get data() {
      return data;
    },
    save,
    uid,
    mkEntry,
    authorFor,
    slot,
    esc,
    COLORS,
    WHEN,
    GREET,
  };
})();


/* ==========================================================================
   openEditor: one dialog for notebooks, topics and pen names

   Always has a name and a colour. Optionally an icon, a "when I write"
   select and a delete button, depending on what is passed in.
   ========================================================================== */

function openEditor({
  title,
  name = '',
  emoji,
  when,
  color = Store.COLORS[0],
  onSave,
  onDelete,
}) {
  const dialog = document.createElement('dialog');

  dialog.innerHTML = editorMarkup({
    title,
    name,
    emoji,
    when,
    color,
    canDelete: Boolean(onDelete),
  });

  const swatchBox = dialog.querySelector('.swatches');
  const colorInput = dialog.querySelector('#dColor');
  const hexLabel = dialog.querySelector('#dHex');


  /* -Colour handling*/

  const markSelectedSwatch = () => {
    swatchBox.querySelectorAll('.swatch').forEach((swatch) => {
      const isSelected = swatch.dataset.color.toLowerCase() === color.toLowerCase();
      swatch.setAttribute('aria-pressed', String(isSelected));
    });
  };

  const setColor = (next) => {
    color = next;
    colorInput.value = next;
    hexLabel.textContent = next;
    markSelectedSwatch();
  };

  Store.COLORS.forEach((swatchColor) => {
    const swatch = document.createElement('button');

    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.dataset.color = swatchColor;
    swatch.style.setProperty('--s', swatchColor);
    swatch.setAttribute('aria-label', `Color ${swatchColor}`);
    swatch.addEventListener('click', () => setColor(swatchColor));

    swatchBox.append(swatch);
  });

  colorInput.addEventListener('input', () => setColor(colorInput.value));
  markSelectedSwatch();


  /* ---------- Buttons ---------- */

  dialog.querySelector('#dCancel').addEventListener('click', () => {
    dialog.close('cancel');
  });

  const deleteButton = dialog.querySelector('#dDel');

  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      if (!confirm('Delete this? It can’t be undone.')) return;

      dialog.close('deleted');
      onDelete();
    });
  }

// closing

  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'ok') {
      const emojiInput = dialog.querySelector('#dEmoji');
      const whenSelect = dialog.querySelector('#dWhen');

      onSave({
        name: dialog.querySelector('#dName').value.trim() || 'Untitled',
        color,
        emoji: emojiInput ? emojiInput.value.trim() || emoji || '📓' : undefined,
        when: whenSelect ? whenSelect.value : undefined,
      });
    }

    dialog.remove();
  });


  //Show it

  document.body.append(dialog);
  dialog.showModal();

  const nameInput = dialog.querySelector('#dName');
  nameInput.focus();
  nameInput.select();
}



function editorMarkup({ title, name, emoji, when, color, canDelete }) 
{
  const iconField = emoji === undefined
      ? ''
      : `
        <label for="dEmoji">Icon</label>
        <input type="text" id="dEmoji" maxlength="4" value="${Store.esc(emoji)}">`;

  const whenOptions = Object.entries(Store.WHEN)
    .map(([key, label]) => {
      const selected = key === when ? 'selected' : '';
      return `<option value="${key}" ${selected}>${label}</option>`;
    })
    .join('');

  const whenField = when === undefined
      ? ''
      : `
        <label for="dWhen">Use this name when I write in the…</label>
        <select id="dWhen">${whenOptions}</select>`;

  const deleteButton = canDelete
    ? '<button type="button" class="btn danger small left" id="dDel">Delete</button>'
    : '';

  // Cancel is a plain button so that pressing Enter in a text field saves.
  return `
    <form method="dialog">
      <h2>${Store.esc(title)}</h2>
      ${iconField}

      <label for="dName">Name</label>
      <input type="text" id="dName" maxlength="40" value="${Store.esc(name)}">
      ${whenField}

      <label>Color</label>
      <div class="swatches"></div>

      <label class="picker">
        Or pick your own
        <input type="color" id="dColor" value="${Store.esc(color)}">
        <output id="dHex">${Store.esc(color)}</output>
      </label>

      <div class="dlg-actions">
        ${deleteButton}
        <button type="button" class="btn small" id="dCancel">Cancel</button>
        <button type="submit" value="ok" class="btn primary small">Save</button>
      </div>
    </form>`;
}
