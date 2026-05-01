import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { 
    type: String,
    required: true, 
    trim: true 
  },
  description: 
  { type: String, 
    default: '', 
    trim: true 
  },
  status: { 
    type: String, 
    enum: ['planning', 'active', 'completed'], 
    default: 'planning' 
  },
  members: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
},
 { timestamps: true });

projectSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Project = mongoose.model('Project', projectSchema);
