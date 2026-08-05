import { Ticket } from '../ticket.js';

it('implements optimistic concurrency control', async () => {
  // create a ticket
  const ticket = Ticket.build({
    title: 'title',
    price: 5,
    userId: '123',
  });
  // save to db
  await ticket.save();

  // fetch ticket 2 times
  const firstInstance = await Ticket.findById(ticket.id);

  const secondInstance = await Ticket.findById(ticket.id);

  // make 2 changes to tickets
  firstInstance!.title = 'New title';
  secondInstance!.title = 'New second title';

  // save the first ticket
  await firstInstance?.save();

  // save the second ticket and expect an error
  try {
    await secondInstance?.save();
  } catch (err) {
    return;
  }

  throw new Error('Should not reach this point');
});

it('increments the record by 1 upon saving', async () => {
  const ticket = Ticket.build({
    title: 'title',
    price: 5,
    userId: '123',
  });
  // save to db
  await ticket.save();

  // console.log(ticket);
  // check that the version shows 0
  expect(+ticket.version).toEqual(0);

  // make a change to the ticket
  const secondInstance = await Ticket.findById(ticket.id);

  secondInstance!.title = 'New title';
  // save to db
  await ticket.save();

  // check that the version shows 1
  expect(+ticket.version).toEqual(1);
});
