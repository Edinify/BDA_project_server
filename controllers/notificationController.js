import { Notification } from "../models/notificationModel.js";

// Get notifications 
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find();

    console.log(notifications, 'notifications');

    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  const { id } = req.params;
  try {
    await Notification.findByIdAndUpdate(id, {});

    return true;
  } catch (err) {
    console.log({ message: { error: err.message } });
    return false;
  }
};
