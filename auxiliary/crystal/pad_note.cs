using Microsoft.Data.SqlClient;
using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Windows.Forms;
using System.Net;
using System.Net.Http;

namespace SimpleNotepad
{
    public class NotepadForm : Form
    {
        private TextBox editor;
        private MenuStrip menuStrip;

        public NotepadForm()
        {
            InitializeComponents();
        }

        private void InitializeComponents()
        {
            Text = "Da - Notepadz";
            Width = 800;
            Height = 600;

            editor = new TextBox
            {
                Multiline = true,
                Dock = DockStyle.Fill,
                ScrollBars = ScrollBars.Both,
                AcceptsTab = true,
                WordWrap = false,
                Font = new System.Drawing.Font("Consolas", 11)
            };

            menuStrip = new MenuStrip();

            var fileMenu = new ToolStripMenuItem("File");

            var newItem = new ToolStripMenuItem("New");
            
            var openItem = new ToolStripMenuItem("Open");
            
            var saveItem = new ToolStripMenuItem("Save");
            
            var exitItem = new ToolStripMenuItem("Exit");

            newItem.Click += NewFile;
            openItem.Click += OpenFile;
            saveItem.Click += SaveFile;
            exitItem.Click += (s, e) => Close();

            fileMenu.DropDownItems.Add(newItem);
            fileMenu.DropDownItems.Add(openItem);
            fileMenu.DropDownItems.Add(saveItem);
            fileMenu.DropDownItems.Add(new ToolStripSeparator());
            fileMenu.DropDownItems.Add(exitItem);

            menuStrip.Items.Add(fileMenu);

            Controls.Add(editor);
            Controls.Add(menuStrip);

            MainMenuStrip = menuStrip;
        }

        private void NewFile(object sender, EventArgs e)
        {
            editor.Clear();
        }

        private void OpenFile(object sender, EventArgs e)
        {
            using (OpenFileDialog dialog = new OpenFileDialog())
            {
                dialog.Filter = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*";

                if (dialog.ShowDialog() == DialogResult.OK)
                {
                    editor.Text = File.ReadAllText(dialog.FileName);
                }
            }
        }

        private void SaveFile(object sender, EventArgs e)
        {
            using (SaveFileDialog dialog = new SaveFileDialog())
            {
                dialog.Filter = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*";

                if (dialog.ShowDialog() == DialogResult.OK)
                {
                    File.WriteAllText(dialog.FileName, editor.Text);
                }
            }
        }
    }
}
