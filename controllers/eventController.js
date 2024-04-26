import { Event } from "../models/eventModel.js";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// Get events for pagination
export const getEventsForPagination = async (req, res) => {
  const { searchQuery, length } = req.query;
  const limit = 20;

  try {
    let totalLength;
    let events;

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");

      const eventsCount = await Event.countDocuments({
        eventName: { $regex: regexSearchQuery },
      });

      events = await Event.find({
        eventName: { $regex: regexSearchQuery },
      })
        .skip(length || 0)
        .limit(limit);

      totalLength = eventsCount;
    } else {
      const eventsCount = await Event.countDocuments();
      totalLength = eventsCount;
      events = await Event.find()
        .skip(length || 0)
        .limit(limit);
    }

    res.status(200).json({ events, totalLength });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create event
export const createEvent = async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    await newEvent.save();

    const eventsCount = await Event.countDocuments();
    const lastPage = Math.ceil(eventsCount / 10);

    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;
  let updatedData = req.body;

  try {
    if (role === "worker") {
      const worker = await Worker.findById(userId);

      const power = worker.profiles.find(
        (item) => item.profile === "events"
      )?.power;

      if (power === "update") {
        delete updatedData.changes;

        updatedData = { changes: updatedData };
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updatedData, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(updatedEvent);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedEvent = await Event.findByIdAndDelete(id);

    if (!deletedEvent) {
      return res.status(404).json({ message: "event not found" });
    }

    res.status(200).json(deletedEvent);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Confirm event changes
export const confirmEventChanges = async (req, res) => {
  const { id } = req.params;
  const { changes } = req.body;

  try {
    const event = await Event.findByIdAndUpdate(
      id,
      { ...changes, changes: {} },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "event not found" });
    }

    res.status(200).json(event);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Cancel event changes
export const cancelEventChanges = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await Event.findByIdAndUpdate(
      id,
      { changes: {} },
      { new: true }
    );

    res.status(200).json(event);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Event notification

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CLIENT_URL
);

const calendar = google.calendar({
  version: "v3",
  auth: process.env.GOOGLE_CLIENT_API_KEY,
});

export const redirectEventNotification = async (req, res) => {
  console.log(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CLIENT_URL,
    process.env.GOOGLE_CLIENT_API_KEY
  );
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ];
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });

    res.redirect(url);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

export const createEventNotification = async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oauth2Client.getToken(code);

  console.log(tokens);
  oauth2Client.setCredentials(tokens);

  res.send("working 123");
};

export const scheduleEvent = async (req, res) => {
  const startDate = new Date();

  startDate.setDate(startDate.getDate() - 3);

  // console.log(oauth2Client);
  try {
    calendar.events.insert({
      calendarId: "primary",
      auth: oauth2Client,
      requestBody: {
        summary: "bla bla bla",
        description: "bla bla bla",
        start: {
          dateTime: "2024-04-25T09:00:00-07:00",
          timeZone: "Asia/Baku",
        },
        end: {
          dateTime: "2024-04-26T09:00:00-07:00",
          timeZone: "Asia/Baku",
        },
      },
    });

    res.send("done");
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
