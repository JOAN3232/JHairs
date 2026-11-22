
import mongoose from "mongoose";

/**
 * JHAIRS — COUNTER MODEL
 *
 * Generates unique numeric IDs for new products.
 *
 * Our four original products use IDs 1–4.
 * The first new product will use ID 5.
 *
 * MongoDB increments the counter atomically,
 * preventing simultaneous creation requests
 * from receiving the same generated number.
 */

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },

  value: {
    type: Number,
    required: true,
    default: 4,
  },
});

const Counter = mongoose.model(
  "Counter",
  counterSchema
);

export default Counter;
