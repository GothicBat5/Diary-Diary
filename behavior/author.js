(() => {
  const $ = (id) => document.getElementById(id);
  const { writer } = Store.data;

  let saveTimer;


  $('wName').value = writer.name;
  $('wBio').value = writer.bio;

  function saveYou() 
  {
    writer.name = $('wName').value.trim();
    writer.bio = $('wBio').value;

    $('wSaved').textContent = 'saving…';
    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
      Store.save();
      $('wSaved').textContent = 'saved ♡';
    }, 400);
  }

  $('wName').addEventListener('input', saveYou);
  $('wBio').addEventListener('input', saveYou);


  // How many pages each pen name has signed, keyed by pen name id
  function countPagesByAuthor() 
  {
    const counts = {};

    Store.data.notebooks.forEach((notebook) => {
      notebook.topics.forEach((topic) => {
        topic.entries.forEach((entry) => {
          counts[entry.author] = (counts[entry.author] || 0) + 1;
        });
      });
    });

    return counts;
  }

  function penTemplate(author, { now, counts }) 
  {
    const isDefault = author.id === writer.defaultId;
    const isSigningNow = author.id === now.id;
    const id = Store.esc(author.id);

    return `
      <li class="pen ${isSigningNow ? 'now' : ''}" style="--c:${Store.esc(author.color)}">
        <div class="pen-head">
          <span class="avatar">${Store.esc(author.emoji)}</span>
          <div>
            <b>${Store.esc(author.name)}</b>
            <small>${counts[author.id] || 0} pages</small>
          </div>
        </div>

        <div class="tags">
          <span class="tag">${Store.WHEN[author.when] || 'Anytime'}</span>
          ${isDefault ? '<span class="tag def">default</span>' : ''}
          ${isSigningNow ? '<span class="tag">signing now</span>' : ''}
        </div>

        <div class="pen-actions">
          <button class="btn small" data-action="edit" data-id="${id}">Edit</button>
          ${
            isDefault
              ? ''
              : `<button class="btn small" data-action="default" data-id="${id}">Make default</button>`
          }
        </div>
      </li>`;
  }

  function render() 
  {
    const now = Store.authorFor();
    const counts = countPagesByAuthor();
    const partOfDay = Store.WHEN[Store.slot()].toLowerCase();

    $('nowHint').textContent = `It’s ${partOfDay} right now, so a new page would be signed “${now.name}”.`;

    $('authorList').innerHTML = writer.authors
      .map((author) => penTemplate(author, { now, counts }))
      .join('');
  }


  function editAuthor(author) 
  {
    const canDelete = writer.authors.length > 1;

    openEditor({
      title: 'Edit pen name',
      name: author.name,
      emoji: author.emoji,
      when: author.when,
      color: author.color,

      onSave: (values) => {
        Object.assign(author, {
          name: values.name,
          emoji: values.emoji,
          color: values.color,
          when: values.when,
        });
        Store.save();
        render();
      },

      onDelete: canDelete
        ? () => {
            writer.authors = writer.authors.filter((item) => item !== author);

            if (writer.defaultId === author.id) 
            {
              writer.defaultId = writer.authors[0].id;
            }

            // Old pages keep the name they were signed with
            Store.save();
            render();
          }
        : null,
    });
  }

  $('authorList').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const author = writer.authors.find((item) => item.id === button.dataset.id);
    if (!author) return;

    if (button.dataset.action === 'default') 
    {
      writer.defaultId = author.id;
      Store.save();
      render();
      return;
    }

    editAuthor(author);
  });

  $('newAuthor').addEventListener('click', () => {
    openEditor({
      title: 'New pen name',
      name: '',
      emoji: '✒️',
      when: 'any',
      color: Store.COLORS[(writer.authors.length * 3) % Store.COLORS.length],

      onSave: (values) => {
        writer.authors.push({
          id: Store.uid(),
          name: values.name,
          emoji: values.emoji,
          color: values.color,
          when: values.when,
        });
        Store.save();
        render();
      },
    });
  });


  render();
})();
