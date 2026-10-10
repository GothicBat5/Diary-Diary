
(() => {
  const shelf = document.getElementById('shelf');
  const greeting = document.getElementById('hello');
  const newBookButton = document.getElementById('newBook');


  /* ---------- Helpers ---------- */

  const countPages = (notebook) =>
    notebook.topics.reduce((total, topic) => total + topic.entries.length, 0);

  const bookTemplate = (notebook) => `
    <div class="book" style="--c:${Store.esc(notebook.color)}">
      <a class="open" href="notebook.html?id=${encodeURIComponent(notebook.id)}">
        <span class="emoji">${Store.esc(notebook.emoji)}</span>
        <span class="label">
          <b>${Store.esc(notebook.name)}</b>
          <small>${notebook.topics.length} topics · ${countPages(notebook)} pages</small>
        </span>
      </a>
      <button
        class="gear"
        data-edit="${Store.esc(notebook.id)}"
        aria-label="Edit ${Store.esc(notebook.name)}">✎</button>
    </div>`;


  /* ---------- Rendering ---------- */

  function renderShelf() 
  {
    const { writer, notebooks } = Store.data;
    const name = writer.name ? `, ${writer.name}` : '';

    greeting.textContent = `${Store.GREET[Store.slot()]}${name}.`;

    if (!notebooks.length) 
    {
      shelf.innerHTML = `
        <p class="empty-shelf">The shelf is empty. Add your first notebook.</p>`;
      return;
    }

    // Each book is a real link, so opening works even without extra JS
    shelf.innerHTML = notebooks.map(bookTemplate).join('');
  }


  /* ---------- Editing a notebook (the ✎ button) ---------- */

  shelf.addEventListener('click', (event) => {
    const gear = event.target.closest('.gear');
    if (!gear) return;

    const notebook = Store.data.notebooks.find((item) => item.id === gear.dataset.edit);
    if (!notebook) return;

    openEditor({
      title: 'Edit notebook',
      name: notebook.name,
      emoji: notebook.emoji,
      color: notebook.color,

      onSave: (values) => {
        notebook.name = values.name;
        notebook.emoji = values.emoji;
        notebook.color = values.color;
        Store.save();
        renderShelf();
      },

      onDelete: () => {
        Store.data.notebooks = Store.data.notebooks.filter((item) => item !== notebook);
        Store.save();
        renderShelf();
      },
    });
  });



  newBookButton.addEventListener('click', () => {
    const randomColor = Store.COLORS[Math.floor(Math.random() * Store.COLORS.length)];

    openEditor({
      title: 'New notebook',
      emoji: '📓',
      color: randomColor,

      onSave: (values) => {
        Store.data.notebooks.push({
          id: Store.uid(),
          name: values.name,
          emoji: values.emoji,
          color: values.color,
          topics: [],
        });
        Store.save();
        renderShelf();
      },
    });
  });


  renderShelf();
})();
