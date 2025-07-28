import { useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { uploadData, getUrl } from "aws-amplify/storage";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./App.css";

// ✅ Local sandbox config
import outputsLocal from "../amplify_outputs.json";

export default function App() {
  const [ready, setReady] = useState(false);
  const [client, setClient] = useState(null);
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: null,
  });

  // ✅ Load backend config
  useEffect(() => {
    async function init() {
      try {
        let config;
        if (window.location.hostname === "localhost") {
          console.log("✅ Using local sandbox config");
          config = outputsLocal;
        } else {
          console.log("✅ Fetching prod config from /amplify_outputs.json");
          const res = await fetch("/amplify_outputs.json");
          config = await res.json();
        }
        Amplify.configure(config);
        setClient(generateClient());
        setReady(true);
      } catch (err) {
        console.error("❌ Amplify init failed:", err);
      }
    }
    init();
  }, []);

  // ✅ Fetch Notes
  async function fetchNotes() {
    if (!client) return;
    try {
      const { data } = await client.models.Note.list();
      const items = await Promise.all(
        data.map(async (note) => {
          if (note.image) {
            note.imageUrl = (await getUrl({ path: note.image })).url;
          }
          return note;
        })
      );
      setNotes(items);
    } catch (err) {
      console.error("❌ Fetch notes failed:", err);
    }
  }

  // ✅ Create Note
  async function createNote(e) {
    e.preventDefault();
    if (!client) return;
    try {
      let imagePath = null;
      if (formData.image) {
        imagePath = `media/${Date.now()}_${formData.image.name}`;
        await uploadData({ path: imagePath, data: formData.image }).result;
      }
      await client.models.Note.create({
        name: formData.name,
        description: formData.description,
        image: imagePath,
      });
      setFormData({ name: "", description: "", image: null });
      fetchNotes();
    } catch (err) {
      console.error("❌ Create note failed:", err);
    }
  }

  // ✅ Delete Note
  async function deleteNote(id) {
    if (!client) return;
    try {
      await client.models.Note.delete({ id });
      fetchNotes();
    } catch (err) {
      console.error("❌ Delete note failed:", err);
    }
  }

  useEffect(() => {
    if (ready) fetchNotes();
  }, [ready]);

  if (!ready)
    return (
      <h2 style={{ textAlign: "center", marginTop: "50px" }}>
        Loading Amplify...
      </h2>
    );

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main className="App">
          <h1>Hello {user.username}</h1>
          <button onClick={signOut}>Sign out</button>

          {/* ✅ Form Create Note */}
          <form onSubmit={createNote} style={{ marginTop: "20px" }}>
            <input
              placeholder="Note name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <input
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
            <input
              type="file"
              onChange={(e) =>
                setFormData({ ...formData, image: e.target.files[0] })
              }
            />
            <button type="submit">Create Note</button>
          </form>

          {/* ✅ List Notes */}
          <div>
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  border: "1px solid #ccc",
                  margin: "10px",
                  padding: "10px",
                }}
              >
                <h3>{note.name}</h3>
                <p>{note.description}</p>
                {note.imageUrl && (
                  <img src={note.imageUrl} alt={note.name} width={200} />
                )}
                <button onClick={() => deleteNote(note.id)}>Delete</button>
              </div>
            ))}
          </div>
        </main>
      )}
    </Authenticator>
  );
}
