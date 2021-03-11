import { FollowTypes } from '../src/util';
import { DatabaseManager } from '../src/DatabaseManager';
import winston from 'winston';

winston.add(new winston.transports.Console({level: "warn"}))

describe('Database Manager Tests', () => {
  let manager: DatabaseManager;

  beforeAll(async () => {
    manager = new DatabaseManager();
  });

  afterAll(async () => {
    await manager.close();
  });

  it('should add, find and remove a single follower for a single subject', async () => {
    const user = { id: "testuser1", inbox: undefined }
    const target = { property: FollowTypes.keyword, value: "value1" }
   
    // clean entries of previous tests
   await manager.removeFollowAction(user.id, user.inbox, [target])
    
    // followerId?: string, followerInbox?: string, following?: {value: string, property:FollowTypes}[]
   await manager.addFollowAction(user.id, user.inbox, [target])

   const followers = await manager.findFollowers( [target] )

   // Should find one match
   expect(followers.get(user.id)?.length).toEqual(1)

   await manager.removeFollowAction(user.id, user.inbox, [target])
    
   const afterfollowers = await manager.findFollowers( [target] )
   
   // Should find no matches
   expect(afterfollowers.get(user.id)).toEqual(undefined)
    
  });



  it('should add, find and remove multiple followers for the same object', async () => {
    const user1 = { id: "testuser1", inbox: undefined }
    const user2 = { id: "testuser2", inbox: undefined }
    const user3 = { id: "testuser3", inbox: "inbox3" }
    const target1 = { property: FollowTypes.keyword, value: "value1" }
    const target2 = { property: FollowTypes.keyword, value: "value2" }
    const target3 = { property: FollowTypes.keyword, value: "value3" }

    // Cleanup in case of previously cancelled test
    await Promise.all([
      manager.removeFollowAction(user1.id, user1.inbox, [target1, target2]),
      manager.removeFollowAction(user2.id, user2.inbox, [target2, target3]),
      manager.removeFollowAction(user3.id, user3.inbox, [target3, target1]),
    ]) 

    await Promise.all([
      manager.addFollowAction(user1.id, user1.inbox, [target1, target2]),
      manager.addFollowAction(user2.id, user2.inbox, [target2, target3]),
      manager.addFollowAction(user3.id, user3.inbox, [target3, target1]),
    ]) 

    const followers1 = await manager.findFollowers([target1])

    // Should find 2 matching users
    expect(Array.from(followers1.keys()).length).toEqual(2)
    expect(followers1.get(user1.id)?.length).toEqual(1)
    expect(followers1.get(user3.id)?.length).toEqual(1)

    const followers2 = await manager.findFollowers([target2])
    // Should find 2 matching users
    expect(Array.from(followers2.keys()).length).toEqual(2)
    expect(followers2.get(user1.id)?.length).toEqual(1)
    expect(followers2.get(user2.id)?.length).toEqual(1)

    const followers3 = await manager.findFollowers([target3])
    // Should find 2 matching users
    expect(Array.from(followers3.keys()).length).toEqual(2)
    expect(followers3.get(user2.id)?.length).toEqual(1)
    expect(followers3.get(user3.id)?.length).toEqual(1)

    const followerscombined = await manager.findFollowers([target1, target2, target3])
    // Should find 2 matches for all 3 users
    expect(Array.from(followerscombined.keys()).length).toEqual(3)
    expect(followerscombined.get(user1.id)?.length).toEqual(2)
    expect(followerscombined.get(user2.id)?.length).toEqual(2)
    expect(followerscombined.get(user3.id)?.length).toEqual(2)

    await Promise.all([
      manager.removeFollowAction(user1.id, user1.inbox, [target1, target2]),
      manager.removeFollowAction(user2.id, user2.inbox, [target2, target3]),
      manager.removeFollowAction(user3.id, user3.inbox, [target3, target1]),
    ]) 

    const followerscombinedAfter = await manager.findFollowers([target1, target2, target3])
    // Should find no matches
    expect(Array.from(followerscombinedAfter.keys()).length).toEqual(0)

  });
  
});