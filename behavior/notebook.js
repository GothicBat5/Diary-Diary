

(() => {
  const $ = (id) => document.getElementById(id);
  const notebookId = new URLSearchParams(location.search).get('id');
  const notebook = Store.data.notebooks.find((item) => item.id === notebookId);

  if (!notebook) 
  {
    document.querySelector('.layout').innerHTML = `
      <p class="empty">
        That notebook isn’t on the shelf.
        <a href="index.html">Back to the shelf</a>
      </p>`;
    return;
  }

// states: 

  const state = {
    topicId: notebook.topics[0]?.id ?? null,
    entryId: null,
  };

  let saveTimer;

  const currentTopic = () => notebook.topics.find((topic) => topic.id === state.topicId);
  const currentEntry = () => currentTopic()?.entries.find((entry) => entry.id === state.entryId);


  const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  // Prefer the pen name's current name; fall back to the one it was signed with
  const authorNameOf = (entry) => {
    const author = Store.data.writer.authors.find((item) => item.id === entry.author);
    return author?.name || entry.authorName || '';
  };

  const subtitleOf = (entry) => {
    const name = authorNameOf(entry);
    return formatDate(entry.date) + (name ? ` · ✒ ${name}` : '');
  };

  // Find a page's card in the list without needing to re-render it
  const entryCard = (entry) =>
    [...$('entryList').querySelectorAll('[data-entry]')].find(
      (card) => card.dataset.entry === entry.id
    );


  const topicTemplate = (topic) => `
    <li>
      <div
        class="topic ${topic.id === state.topicId ? 'on' : ''}"
        data-topic="${Store.esc(topic.id)}"
        style="--c:${Store.esc(topic.color)}"
        role="button"
        tabindex="0">
        <i></i>
        <span>${Store.esc(topic.name)}</span>
        <button class="edit" aria-label="Edit topic">✎</button>
      </div>
    </li>`;

  const entryTemplate = (entry, topic) => `
    <li>
      <button
        class="entry ${entry.id === state.entryId ? 'on' : ''}"
        data-entry="${Store.esc(entry.id)}"
        style="--c:${Store.esc(topic.color)}">
        <b>${Store.esc(entry.title || 'Untitled page')}</b>
        <small>${Store.esc(subtitleOf(entry))}</small>
        <p>${Store.esc(entry.body)}</p>
      </button>
    </li>`;

  function renderHeader(topic, entry) 
  {
    // The accent colour follows the open page's topic, else the notebook
    const accent = entry && topic ? topic.color : notebook.color;

    document.documentElement.style.setProperty('--c', accent);
    document.title = `${notebook.name} · My Cozy Diary`;
    $('nbTitle').textContent = `${notebook.emoji} ${notebook.name}`;
  }

  function renderTopics() 
  {
    $('topicList').innerHTML =
      notebook.topics.map(topicTemplate).join('') ||
      '<li class="empty-note">Add a topic to begin.</li>';
  }

  function renderEntries(topic) 
  {
    $('newEntry').disabled = !topic;

    if (!topic) 
    {
      $('entryList').innerHTML = '';
      return;
    }

    if (!topic.entries.length) 
    {
      $('entryList').innerHTML = '<li class="empty-note">No pages yet. Start one!</li>';
      return;
    }

    // Newest page first
    $('entryList').innerHTML = [...topic.entries]
      .reverse()
      .map((entry) => entryTemplate(entry, topic))
      .join('');
  }

  function renderEditor(entry) 
  {
    $('editor').classList.toggle('has', Boolean(entry));
    if (!entry) return;

    $('entryTitle').value = entry.title;
    $('entryBody').value = entry.body;
    $('entryDate').textContent = formatDate(entry.date);
    $('saved').textContent = '';

    const authors = Store.data.writer.authors;

    const options = authors.map((author) => {
      const selected = author.id === entry.author ? 'selected' : '';
      const label = Store.esc(`${author.emoji} ${author.name}`);
      return `<option value="${Store.esc(author.id)}" ${selected}>${label}</option>`;
    });

    // The pen name was deleted: keep showing the one the page was signed with
    if (!authors.some((author) => author.id === entry.author)) 
    {
      options.unshift(`
        <option value="${Store.esc(entry.author || '')}" selected>
          ${Store.esc(entry.authorName || 'Unknown')}
        </option>`);
    }

    $('entryAuthor').innerHTML = options.join('');
  }

  function render() {
    const topic = currentTopic();
    const entry = currentEntry();

    renderHeader(topic, entry);
    renderTopics();
    renderEntries(topic);
    renderEditor(entry);
  }

  // Move to a topic and/or page, then redraw
  function select(topicId, entryId) 
  {
    state.topicId = topicId;
    state.entryId = entryId;

    // Only matters on phones, where the editor replaces the pages list
    $('layout').classList.toggle('editing', Boolean(entryId));

    render();
  }


  /* ==========================================================================
     Writing: autosave and signing
     ========================================================================== */

  function autosave() 
  {
    const entry = currentEntry();
    if (!entry) return;

    entry.title = $('entryTitle').value;
    entry.body = $('entryBody').value;

    $('saved').textContent = 'saving…';
    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
      Store.save();
      $('saved').textContent = 'saved ♡';

      // Update the list text without re-rendering (and stealing focus from) the editor
      const card = entryCard(entry);
      if (!card) return;

      card.querySelector('b').textContent = entry.title || 'Untitled page';
      card.querySelector('p').textContent = entry.body;
    }, 500);
  }

  $('entryTitle').addEventListener('input', autosave);
  $('entryBody').addEventListener('input', autosave);

  $('entryAuthor').addEventListener('change', () => {
    const entry = currentEntry();
    const author = Store.data.writer.authors.find((item) => item.id === $('entryAuthor').value);
    if (!entry || !author) return;

    entry.author = author.id;
    entry.authorName = author.name;
    Store.save();

    const card = entryCard(entry);
    if (card) card.querySelector('small').textContent = subtitleOf(entry);

    $('saved').textContent = 'signed ♡';
  });


  function editTopic(topic) 
  {
    openEditor({
      title: 'Edit topic',
      name: topic.name,
      color: topic.color,

      onSave: (values) => {
        topic.name = values.name;
        topic.color = values.color;
        Store.save();
        render();
      },

      onDelete: () => {
        notebook.topics = notebook.topics.filter((item) => item !== topic);
        Store.save();
        select(notebook.topics[0]?.id ?? null, null);
      },
    });
  }

  $('topicList').addEventListener('click', (event) => {
    const row = event.target.closest('[data-topic]');
    if (!row) return;

    const topic = notebook.topics.find((item) => item.id === row.dataset.topic);
    if (!topic) return;

    if (event.target.closest('.edit')) {
      editTopic(topic);
      return;
    }

    select(topic.id, null);
  });

  // Topic rows are focusable "buttons", so Enter and Space should open them
  $('topicList').addEventListener('keydown', (event) => {
    const isRow = event.target.dataset.topic !== undefined;
    const isActivationKey = event.key === 'Enter' || event.key === ' ';

    if (isRow && isActivationKey) {
      event.preventDefault();
      event.target.click();
    }
  });

  $('newTopic').addEventListener('click', () => {
    openEditor({
      title: 'New topic',
      color: Store.COLORS[(notebook.topics.length * 2) % Store.COLORS.length],

      onSave: (values) => {
        const topic = {
          id: Store.uid(),
          name: values.name,
          color: values.color,
          entries: [],
        };

        notebook.topics.push(topic);
        Store.save();
        select(topic.id, null);
      },
    });
  });


  $('entryList').addEventListener('click', (event) => {
    const card = event.target.closest('[data-entry]');
    if (card) select(state.topicId, card.dataset.entry);
  });

  $('newEntry').addEventListener('click', () => {
    const topic = currentTopic();
    if (!topic) return;

    const entry = Store.mkEntry('', '');

    topic.entries.push(entry);
    Store.save();
    select(topic.id, entry.id);
    $('entryTitle').focus();
  });

  $('delEntry').addEventListener('click', () => {
    if (!confirm('Delete this page?')) return;

    const topic = currentTopic();
    if (!topic) return;

    topic.entries = topic.entries.filter((entry) => entry.id !== state.entryId);
    Store.save();
    select(state.topicId, null);
  });

  // Phone only: go from the editor back to the pages list
  $('backToList').addEventListener('click', () => select(state.topicId, null));

//notebook cover
  $('editBook').addEventListener('click', () => {
    openEditor({
      title: 'Notebook cover',
      name: notebook.name,
      emoji: notebook.emoji,
      color: notebook.color,

      onSave: (values) => {
        notebook.name = values.name;
        notebook.emoji = values.emoji;
        notebook.color = values.color;
        Store.save();
        render();
      },
    });
  });


  render();
})();
