import { MongoClient } from 'mongodb'

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'some-mongo';

describe('insert', () => {
  let connection : MongoClient;
  let db : any;

  beforeAll(async () => {
    connection = await MongoClient.connect(url, {
      useNewUrlParser: true,
    });
    db = await connection.db(dbName);
  });

  afterAll(async () => {
    await connection.close();
    await db.close();
  });

  it('should insert a doc into collection', async () => {

    const f = async () => {
      const users = db.collection('test');

      const mockUser = {id: 'some-user-id', name: 'John'};
      await users.insertOne(mockUser);

      const insertedUser = await users.findOne({id: 'some-user-id'});
      expect(insertedUser).toEqual(mockUser);
    
      await users.deleteOne( mockUser )

      const removedUser = await users.findOne({id: 'some-user-id'});
      expect(!!removedUser).toEqual(false);
    }
    
    await f()
    // Should not give duplicate key exception
    await f()
  });
});