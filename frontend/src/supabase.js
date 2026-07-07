import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://spwfnrzenjfwirqaqgkf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwd2Zucnplbmpmd2lycWFxZ2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4Njg0NzYsImV4cCI6MjA5MjQ0NDQ3Nn0.07y3KsIJ_om23MNaur3Jz0Z-P4HGutKEbLmU80uLjsI'
);
