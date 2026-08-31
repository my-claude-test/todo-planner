import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function isValidObjectId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}
