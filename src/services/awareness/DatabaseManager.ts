import mongoose from 'mongoose';
import { FollowTypes } from './util';
import * as winston from 'winston'
const Schema = mongoose.Schema;

// // Connection URL
// const url = 'mongodb://localhost:27017';
// Database Name
const dbName = 'some-mongo';

const FollowActionSchema = new Schema({
  follower: {
    id: String || null,
    inbox: String || null,
  },
  following:
  {
    value: String,
    property: String,
  },
})

// Add automatic notifications on Follower save.
FollowActionSchema.pre('save', function(next) {
  const follower = this.get('follower')
  const following = this.get('following');
  if (following.property === 'author') {
    notifyAuthor(follower.id, following.value)
  }
  next();
})

// Create database model
const FollowAction = mongoose.model('FollowAction', FollowActionSchema)


export class DatabaseManager {

  connection: Promise<typeof mongoose>;
  constructor(mongoDBURI: string) {
    this.connection = this.init(mongoDBURI);
  } 

  private async init(mongoDBURI: string) {
    // Create database connection
    return await mongoose.connect(mongoDBURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true
    });
  }

  public async close() {
    return await (await this.connection).disconnect();
  }

  /**
   * Add new following actions.
   * This function is called if an actor in the network requests the service to subscribe to notifications for artefacts with certain topics.
   * @param followerId The identifier of the new follower. Can be undefined
   * @param followerInbox The inbox of the new follower. Can be undefined
   * @param following An array of topics to follow 
   */
  public async addFollowAction(followerId?: string, followerInbox?: string, following?: {value: string, property:FollowTypes}[]) {
    if (!following || (!followerId && !followerInbox)) { 
      winston.log('warn', `Could not add follow actions for user with id: ${followerId} with declared inbox ${followerInbox} trying to follow ${JSON.stringify(following)}.`)
      return;
    }
    console.log('adding follow', followerId, followerInbox, following)
    // wait for database initialization
    if (!await this.connection) {
      throw new Error('Database not connection correctly!')
    }
    
    const follower = {id: followerId || null, inbox: followerInbox || null}
    for (let followingItem of following) {
      if (followingItem.property == FollowTypes.keyword) {
        followingItem.value = followingItem.value.toLowerCase();
      }
    }

    for (let followingObject of following) {
      const action = new FollowAction({follower: follower, following: followingObject})
      await action.save();
      winston.log('verbose', `Added database entry for ${JSON.stringify(action)}`)
    }
  }


  /**
   * Add new following actions.
   * This function is called if an actor in the network requests the service to subscribe to notifications for artefacts with certain topics.
   * @param followerId The identifier of the new follower. Can be undefined
   * @param followerInbox The inbox of the new follower. Can be undefined
   * @param following An array of topics to follow 
   */
  public async removeFollowAction(followerId?: string, followerInbox?: string, toRemove?: {value: string, property:FollowTypes}[]) {
    if (!toRemove || (!followerId && !followerInbox)) { 
      winston.log('warn', `Could not remove follow actions for user with id: ${followerId} with declared inbox ${followerInbox} for entry ${JSON.stringify(toRemove)}.`)
      return;
    }
    // wait for database initialization
    if (!await this.connection) {
      throw new Error('Database not connection correctly!')
    }
    
    const user = {id: followerId || null, inbox: followerInbox || null}
    for (let removeItem of toRemove) {
      if (removeItem.property === FollowTypes.keyword) {
        const found = await FollowAction.find({follower: user, following: removeItem})
        removeItem.value = removeItem.value.toLowerCase();
      }
    }
    for (let removeItem of toRemove) {
      await FollowAction.deleteMany({follower: user, following: removeItem})
      winston.log('verbose', `Deleted database entry for ${JSON.stringify({follower: user, following: removeItem})}`)
    }
  }


  /**
   * Function to query database for all followers interested in the processed artefact.
   * This is a proof of concept approach!
   * @param artefactId The id of the artefact
   * @param title The artefact title or description
   * @param keywords The keywords associated with the artefact
   * @param authors The artefact authors or creators
   */
  public async findFollowers(mapping: {property: FollowTypes, value: string}[]) {
    // wait for database initialization
    // wait for database initialization
    if (!await this.connection) {
      throw new Error('Database not connection correctly!')
    }

    // Map all followers on the exact reasons they are being notified
    const followerMap = new Map();

    for (let entry of mapping) {
      switch (entry.property) {
        case FollowTypes.title:
          const keywords = entry.value.split(/\s/)  
          for (let value of keywords) {
            winston.log('debug', `Finding followers for property ${FollowTypes.keyword} with value ${value.toLowerCase()}`);
            (await FollowAction.find({following: {property: FollowTypes.keyword , value: value.toLowerCase()}})).map((action: any) => {
              const followerId = action.follower.id
              followerMap.get(followerId)
                ? followerMap.get(followerId).push({property: FollowTypes.title , value: value.toLowerCase()})
                : followerMap.set(followerId, [{property: FollowTypes.title , value: value.toLowerCase()}] )
            })
          }
          break;
        case FollowTypes.keyword:
          for (let value of entry.value.split(/\s/)) {
            winston.log('debug', `Finding followers for property ${FollowTypes.keyword} with value ${value.toLowerCase()}`);
            (await FollowAction.find({following: {property: FollowTypes.keyword , value: value.toLowerCase()}})).map((action: any) => {
              const followerId = (action as any).follower.id
              followerMap.get(followerId)
                ? followerMap.get(followerId).push({property: FollowTypes.keyword , value: value.toLowerCase()})
                : followerMap.set(followerId, [{property: FollowTypes.keyword , value: value.toLowerCase()}] )
            })
          }
          break;
        default:
          winston.log('debug', `Finding followers for property ${FollowTypes.artefact} with value ${entry.value}`);
          (await FollowAction.find({following: entry}).map((action: any) => {
            const followerId = (action as any).follower.id
            followerMap.get(followerId)
              ? followerMap.get(followerId).push(entry)
              : followerMap.set(followerId, [entry] )
          }))
          break;
      }
    }
    return followerMap as Map<string, {property: FollowTypes, value: string}[]>;
  }

  public async dump() {
    return await FollowAction.find()
  }

  public async cleardb() {
    return await FollowAction.deleteMany()
  }
}


// Helper functions


// Function to notify author of follower
/**
 * 
 * @param followerId The id of the new actor following the author
 * @param authorId The author to be notified of the following event
 */
async function notifyAuthor(followerId: string, authorId: string) {
  // Try to find author inbox

  // if inbox, send notification that person started following you.

}
